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

/**
 * The lines a terminal printed, its escape sequences taken out. A shell's
 * own echo of what was typed is not output: PowerShell's PSReadLine suggests,
 * on the line being typed, a command from the history the shells share —
 * `echo first-marker-A` run in one shows greyed out in the other as soon as
 * `e` is typed there. That is no output of the first shell in the second.
 */
const outputLines = (text: string) =>
  text
    // eslint-disable-next-line no-control-regex
    .replace(/\x1b\][^\x07]*\x07|\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b[@-_]/g, "")
    .split(/\r?\n/)
    .map((l) => l.trim());

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

/** Waits until the terminal printed this line, its escapes taken out. */
async function untilLine(t: Terminals, id: string, line: string, ms = 20_000): Promise<void> {
  const start = Date.now();
  for (;;) {
    if (outputLines(t.scrollback(id)).includes(line)) return;
    if (Date.now() - start > ms)
      throw new Error(`no line ${line} in: ${JSON.stringify(t.scrollback(id).slice(-500))}`);
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
    // Each command's output, a line of its own — not the command's echo.
    await untilLine(t, a.id, "first-marker-A");
    await untilLine(t, b.id, "second-marker-B");
    // What each printed, line by line: neither's output in the other.
    assert.ok(!outputLines(t.scrollback(a.id)).includes("second-marker-B"));
    assert.ok(!outputLines(t.scrollback(b.id)).includes("first-marker-A"));
    t.close(b.id);
    t.input(a.id, "echo still-here\r");
    await until(t, a.id, /still-here\s/);
  } finally {
    await t.closeAll();
    await new Promise((ok) => setTimeout(ok, 200));
    await fs.promises.rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});
