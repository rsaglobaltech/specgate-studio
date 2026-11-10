/**
 * The host serves the UI's files and the JSON-RPC WebSocket on one port, so the
 * browser opens one address (draft-workbench A2: `specgate-studio serve`).
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import WebSocket from "ws";
import type { ProcessRunner, SectionReader } from "@specgate-studio/core";
import { startHost } from "../src/index.js";

const reader: SectionReader = { read: async (section) => ({ section }) };
const runner: ProcessRunner = { run: async () => 0 };

/** A folder of its own, holding the UI's files and, beside them, a file the host must not serve. */
function ui(): { parent: string; dir: string } {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "sg-ui-"));
  const dir = path.join(parent, "ui");
  fs.mkdirSync(path.join(dir, "assets"), { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><title>studio</title>");
  fs.writeFileSync(path.join(dir, "assets", "app.js"), "console.log(1)");
  fs.writeFileSync(path.join(parent, "secret.txt"), "no");
  return { parent, dir };
}

test("REQ-035 SCN-100: one address — the UI's index, its assets with their type, and the WebSocket", async () => {
  const { parent, dir } = ui();
  const host = await startHost({ projectDir: "/tmp/sprich", reader, runner, port: 0, ui: dir });
  try {
    const base = host.url.replace(/^ws/, "http");
    const index = await fetch(base);
    assert.equal(index.status, 200);
    assert.match(index.headers.get("content-type") ?? "", /text\/html/);
    assert.match(await index.text(), /<title>studio<\/title>/);
    const js = await fetch(`${base}assets/app.js`);
    assert.match(js.headers.get("content-type") ?? "", /javascript/);
    assert.match(js.headers.get("cache-control") ?? "", /immutable/);
    // A view's address the UI routes itself answers the index.
    assert.equal((await fetch(`${base}changes`)).status, 200);
    // Nothing outside the UI's folder.
    assert.equal((await fetch(`${base}..%2Fsecret.txt`)).status, 404);
    assert.equal((await fetch(`${base}assets/..%2F..%2Fsecret.txt`)).status, 404);
    const ws = new WebSocket(host.url);
    await new Promise((ok, ko) => ws.once("open", ok).once("error", ko));
    ws.close();
  } finally {
    await host.close();
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test("REQ-035: without a UI folder the host still answers the WebSocket, and HTTP gets 404", async () => {
  const host = await startHost({ projectDir: "/tmp/sprich", reader, runner, port: 0 });
  try {
    assert.equal((await fetch(host.url.replace(/^ws/, "http"))).status, 404);
  } finally {
    await host.close();
  }
});

test("REQ-032 SCN-094: Explorer's files and a file's text come from the host; a path out of the project is refused", async () => {
  const reads: string[] = [];
  const host = await startHost({
    projectDir: "/tmp/sprich",
    reader,
    runner,
    port: 0,
    files: {
      list: async () => ["docs/brief.md", "docs/specs/changes/draft-workbench/proposal.md"],
      read: async (p) => (reads.push(p), `# ${p}`),
    },
  });
  try {
    const ws = new WebSocket(host.url);
    await new Promise((ok, ko) => ws.once("open", ok).once("error", ko));
    let id = 0;
    const ask = (method: string, params: unknown) =>
      new Promise<{ result?: unknown; error?: { code: number } }>((ok) => {
        const n = ++id;
        ws.on("message", (raw) => {
          const m = JSON.parse(String(raw));
          if (m.id === n) ok(m);
        });
        ws.send(JSON.stringify({ jsonrpc: "2.0", id: n, method, params }));
      });
    assert.deepEqual((await ask("files.list", {})).result, [
      "docs/brief.md",
      "docs/specs/changes/draft-workbench/proposal.md",
    ]);
    assert.deepEqual((await ask("file.read", { path: "docs/brief.md" })).result, {
      path: "docs/brief.md",
      text: "# docs/brief.md",
    });
    for (const bad of ["../secret", "/etc/passwd", "docs/../../x", "C:\\\\x", ""]) {
      assert.equal((await ask("file.read", { path: bad })).error?.code, -32602, bad);
    }
    assert.deepEqual(reads, ["docs/brief.md"], "a refused path is never read");
    ws.close();
  } finally {
    await host.close();
  }
});
