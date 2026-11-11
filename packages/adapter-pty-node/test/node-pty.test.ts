/**
 * The real pty (draft-terminal): the Developer's shell in the project's
 * folder, on the system the test runs on (REQ-051, REQ-052).
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Terminals, shellFor } from "@specgate-studio/core";
import { NodePty, hasProgram } from "../src/index.js";

const WIN = process.platform === "win32";

/** Waits until the terminal's output matches, or fails with what it printed. */
async function until(t: Terminals, id: string, re: RegExp, ms = 20_000): Promise<string> {
  const start = Date.now();
  for (;;) {
    const out = t.scrollback(id);
    if (re.test(out)) return out;
    if (Date.now() - start > ms) throw new Error(`no ${re} in: ${JSON.stringify(out.slice(-500))}`);
    await new Promise((ok) => setTimeout(ok, 50));
  }
}

function project(): string {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "sprich-")));
}

test(`REQ-051 ${WIN ? "SCN-151" : "SCN-151 SCN-152"}, REQ-052${WIN ? " SCN-153" : ""}: a terminal opens the Developer's shell in the project's folder, and ${WIN ? "Get-Location" : "pwd"} prints it`, async () => {
  const dir = project();
  const shell = shellFor(process.platform, process.env, hasProgram);
  const t = new Terminals(new NodePty(), { cwd: dir, shell });
  try {
    const { id, name } = t.open(100, 30);
    assert.equal(name, `${shell.name} 1`);
    t.input(id, WIN ? "Get-Location\r" : "pwd\r");
    const out = await until(t, id, new RegExp(path.basename(dir)));
    assert.ok(out.includes(path.basename(dir)), out);
  } finally {
    await t.closeAll();
    await new Promise((ok) => setTimeout(ok, 200));
    await fs.promises.rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});

test("REQ-055 REQ-056: two real shells at once — each answers its own command, neither's output in the other", async () => {
  const dir = project();
  const t = new Terminals(new NodePty(), {
    cwd: dir,
    shell: shellFor(process.platform, process.env, hasProgram),
  });
  try {
    const a = t.open(100, 30);
    const b = t.open(100, 30);
    t.input(a.id, "echo first-marker-A\r");
    t.input(b.id, "echo second-marker-B\r");
    await until(t, a.id, /first-marker-A\s/);
    await until(t, b.id, /second-marker-B\s/);
    assert.doesNotMatch(t.scrollback(a.id), /second-marker-B/);
    assert.doesNotMatch(t.scrollback(b.id), /first-marker-A/);
    t.close(b.id);
    t.input(a.id, "echo still-here\r");
    await until(t, a.id, /still-here\s/);
  } finally {
    await t.closeAll();
    await new Promise((ok) => setTimeout(ok, 200));
    await fs.promises.rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});
