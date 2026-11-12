/**
 * draft-desktop REQ-151 — the core host as the desktop app's sidecar: on
 * 127.0.0.1 only, serving the same UI, and ending with every process it
 * started when its window closes. The window itself is the Tauri shell's
 * (apps/desktop/src-tauri); this proves the sidecar it starts.
 */
import test, { after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as net from "node:net";
import * as os from "node:os";
import * as path from "node:path";
import WebSocket from "ws";
import { UI_DIST } from "@specgate-studio/cli";
import {
  WIN,
  alive,
  descendants,
  endAsTheShell,
  posix,
  scratch,
  sidecar,
  until,
  type Sidecar,
} from "./support.js";
import { takeToken } from "../src/sidecar.js";

const made: string[] = [];
const dir = (p: string) => {
  const d = scratch(p);
  made.push(d);
  return d;
};
after(() => {
  for (const d of made) fs.rmSync(d, { recursive: true, force: true });
});

/** A UI connected to the host: asks over JSON-RPC, as the window's page does. */
async function rpc(url: string) {
  const ws = new WebSocket(url.replace(/^http/, "ws"));
  await new Promise((ok, ko) => ws.once("open", ok).once("error", ko));
  let id = 0;
  const ask = (method: string, params: unknown = {}) =>
    new Promise<{ result?: any; error?: any }>((ok) => {
      const n = ++id;
      const on = (raw: WebSocket.RawData) => {
        const m = JSON.parse(String(raw));
        if (m.id === n) (ws.off("message", on), ok(m));
      };
      ws.on("message", on);
      ws.send(JSON.stringify({ jsonrpc: "2.0", id: n, method, params }));
    });
  return { ask, ws };
}

function refused(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.connect({ host, port, timeout: 2_000 });
    s.once("connect", () => (s.destroy(), resolve(false)));
    s.once("timeout", () => (s.destroy(), resolve(true)));
    s.once("error", () => resolve(true));
  });
}

/** A terminal running in the host, and the processes under the sidecar once it runs. */
async function withTerminal(s: Sidecar): Promise<number[]> {
  const ui = await rpc(s.page);
  const opened = await ui.ask("terminal.open", { cols: 80, rows: 24 });
  assert.ok(opened.result?.id, `a terminal opens: ${JSON.stringify(opened)}`);
  await until(() => descendants(s.child.pid!).length > 0, 15_000, "the terminal's shell runs");
  ui.ws.close();
  return descendants(s.child.pid!);
}

test("REQ-151 SCN-451: the sidecar serves the studio's UI on 127.0.0.1 only, from a folder of its own", async () => {
  const home = dir("sg-home-");
  const sprich = dir("sprich-");
  const s = await sidecar(sprich, home);
  try {
    assert.equal(s.first.type, "ready");
    assert.match(s.ready.url, /^http:\/\/127\.0\.0\.1:\d+\/$/);
    assert.equal(s.ready.owned, true, "the sidecar started the host");
    assert.equal(s.ready.projectDir, sprich);
    // Nothing without the window's session token (A2); with it, the same UI the browser gets (REQ-158).
    assert.equal((await fetch(s.ready.url)).status, 403);
    const res = await fetch(s.ready.url, { headers: s.auth });
    assert.equal(res.status, 200);
    assert.equal(await res.text(), fs.readFileSync(path.join(UI_DIST, "index.html"), "utf8"));
    // Not on any other address of the machine.
    const port = Number(new URL(s.ready.url).port);
    const lan = Object.values(os.networkInterfaces())
      .flat()
      .find((a) => a && a.family === "IPv4" && !a.internal);
    if (lan) assert.equal(await refused(lan.address, port), true, `not served on ${lan.address}`);
    // It opened the project: sprich is the most recent one now.
    const recent = JSON.parse(fs.readFileSync(path.join(home, "recent-projects.json"), "utf8"));
    assert.equal(posix(recent[0].path), posix(sprich));
  } finally {
    await endAsTheShell(s);
  }
});

test("REQ-151 SCN-451: with no folder given, the sidecar opens the last project opened — or asks for one when there is none", async () => {
  const home = dir("sg-home-");
  const none = await sidecar(null, home);
  assert.deepEqual(none.first, { type: "choose", recent: [] });
  assert.equal(await none.exited, 0);

  const sprich = dir("sprich-");
  const first = await sidecar(sprich, home);
  await endAsTheShell(first);
  const again = await sidecar(null, home);
  try {
    assert.equal(again.first.type, "ready");
    assert.equal(again.ready.projectDir, sprich);
  } finally {
    await endAsTheShell(again);
  }
});

test("REQ-151 SCN-452: closing the window — the shell closes the sidecar's input — ends the sidecar and the terminal it runs (the Windows path)", async () => {
  const home = dir("sg-home-");
  const s = await sidecar(dir("sprich-"), home);
  const tree = await withTerminal(s);
  assert.ok(tree.length > 0, "a shell runs under the sidecar");
  // What a Job object leaves to the sidecar on Windows, and what any shell
  // does first: its input ends, and the sidecar ends what it started.
  s.child.stdin.end();
  assert.equal(await s.exited, 0, "the sidecar ended on its own");
  await until(() => !tree.some(alive), 10_000, `no process of the sidecar's left: ${tree}`);
  assert.deepEqual(fs.readdirSync(path.join(home, "hosts")), [], "its lock is gone");
});

test(
  "REQ-151 SCN-452: closing the window — the shell ends the sidecar's process group — leaves no process it started (macOS and Linux)",
  { skip: WIN && "a Job object on Windows: the shell's Rust test" },
  async () => {
    const home = dir("sg-home-");
    const s = await sidecar(dir("sprich-"), home);
    const tree = await withTerminal(s);
    process.kill(-s.child.pid!, "SIGTERM");
    await s.exited;
    await until(() => !tree.some(alive), 10_000, `no process of the sidecar's left: ${tree}`);
    assert.equal(alive(s.child.pid!), false);
  },
);

test("REQ-151: the sidecar takes its session token from the environment — never its arguments — and leaves none for what it starts", async () => {
  const env: NodeJS.ProcessEnv = { SPECGATE_STUDIO_TOKEN: "t".repeat(43), PATH: "/bin" };
  assert.equal(takeToken(env), "t".repeat(43));
  assert.equal(env.SPECGATE_STUDIO_TOKEN, undefined, "out of the environment its children inherit");
  assert.throws(() => takeToken({}), /SPECGATE_STUDIO_TOKEN/);

  // Started with none, it serves nothing.
  const home = dir("sg-home-");
  const s = await sidecar(dir("sprich-"), home, null);
  assert.equal(s.first.type, "error");
  assert.equal(await s.exited, 1);
  assert.equal(fs.existsSync(path.join(home, "hosts")), false, "no host, no lock");
});

test("REQ-151 REQ-158: a window that joins another process's host gets a token of its own from that host; the lock that lets it is the Developer's alone", async () => {
  const home = dir("sg-home-");
  const folder = dir("sprich-");
  const first = await sidecar(folder, home);
  const again = await sidecar(folder, home);
  try {
    assert.equal(again.ready.owned, false);
    assert.ok(again.ready.token, "the joined host issued a token");
    assert.notEqual(again.token, first.token);
    assert.equal((await fetch(again.ready.url, { headers: again.auth })).status, 200);
    assert.equal((await fetch(first.ready.url, { headers: first.auth })).status, 200);
    if (!WIN) {
      const [lock] = fs.readdirSync(path.join(home, "hosts"));
      assert.equal(fs.statSync(path.join(home, "hosts", lock!)).mode & 0o077, 0, "the lock: 0600");
      assert.equal(fs.statSync(path.join(home, "hosts")).mode & 0o077, 0, "its folder: 0700");
    }
  } finally {
    await endAsTheShell(first);
  }
});
