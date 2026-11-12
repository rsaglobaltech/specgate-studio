/**
 * draft-desktop REQ-152 — one window per project, each over its own core
 * host. The shell keeps one window per project key and focuses it when the
 * project is opened again (src-tauri/src/windows.rs); the sidecar it starts
 * for each opening says which host serves the project, and never starts a
 * second one for a project that has one.
 */
import test, { after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { alive, endAsTheShell, posix, scratch, sidecar, WIN } from "./support.js";

const made: string[] = [];
const dir = (p: string) => {
  const d = scratch(p);
  made.push(d);
  return d;
};
after(() => {
  for (const d of made) fs.rmSync(d, { recursive: true, force: true });
});

test("REQ-152 SCN-453: a second project opens over its own core host, and the first one's host is unchanged", async () => {
  const home = dir("sg-home-");
  const sprich = await sidecar(dir("sprich-"), home);
  const studio = await sidecar(dir("specgate-studio-"), home);
  try {
    assert.equal(sprich.ready.owned, true);
    assert.equal(studio.ready.owned, true);
    assert.notEqual(studio.ready.url, sprich.ready.url, "a host of its own");
    assert.notEqual(studio.ready.key, sprich.ready.key, "a window of its own");
    assert.equal(fs.readdirSync(path.join(home, "hosts")).length, 2);
    // sprich's host still answers, on the same address.
    assert.equal((await fetch(sprich.ready.url, { headers: sprich.auth })).status, 200);
    // The recent list the shell's menu shows: both, the latest first.
    assert.deepEqual(
      studio.ready.recent.map((r) => posix(r.path)),
      [studio.ready.projectDir, sprich.ready.projectDir].map(posix),
    );
  } finally {
    await endAsTheShell(studio);
    await endAsTheShell(sprich);
  }
});

test("REQ-152 SCN-454: opening sprich again finds its one host — the same key, so the shell focuses its window — and starts no second host", async () => {
  const home = dir("sg-home-");
  const folder = dir("sprich-");
  const first = await sidecar(folder, home);
  // The same folder, spelled as the Developer may type it again.
  const spelled = WIN || process.platform === "darwin" ? folder.toUpperCase() : `${folder}/`;
  const again = await sidecar(spelled, home);
  try {
    assert.equal(again.first.type, "ready");
    assert.equal(again.ready.owned, false, "it joined; it started nothing");
    assert.equal(again.ready.key, first.ready.key, "the key the shell focuses the window by");
    assert.equal(again.ready.url, first.ready.url, "the one host");
    assert.notEqual(again.token, first.token, "a token of its own for the window (A2)");
    assert.equal(await again.exited, 0, "a sidecar that joined ends at once");
    assert.equal(alive(first.child.pid!), true);
    assert.equal(fs.readdirSync(path.join(home, "hosts")).length, 1, "one host for sprich");
  } finally {
    await endAsTheShell(first);
  }
});
