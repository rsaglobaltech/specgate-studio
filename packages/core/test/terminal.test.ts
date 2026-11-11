/**
 * draft-terminal in the core: the Developer's shell on each system (REQ-051,
 * REQ-052), several terminals each with its own pty (REQ-055), each keeping its
 * scrollback, never mixed (REQ-056); a studio command shown as typed, one
 * argument per value (REQ-054).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryPty, Scrollback, Terminals, shellFor, shown } from "../src/index.js";

test("REQ-051 SCN-151 SCN-152, REQ-052 SCN-153: the Developer's shell — $SHELL on macOS and Linux, PowerShell on Windows", () => {
  assert.deepEqual(
    shellFor("darwin", { SHELL: "/bin/zsh" }, () => false),
    { file: "/bin/zsh", args: ["-l"], name: "zsh" },
  );
  assert.deepEqual(
    shellFor("linux", { SHELL: "/usr/bin/bash" }, () => false),
    { file: "/usr/bin/bash", args: ["-l"], name: "bash" },
  );
  assert.deepEqual(
    shellFor("linux", {}, () => false),
    { file: "/bin/sh", args: ["-l"], name: "sh" },
  );
  assert.deepEqual(
    shellFor("win32", {}, (c) => c === "pwsh"),
    { file: "pwsh.exe", args: ["-NoLogo"], name: "pwsh" },
  );
  assert.deepEqual(
    shellFor("win32", {}, () => false),
    { file: "powershell.exe", args: ["-NoLogo"], name: "powershell" },
  );
});

test("REQ-054 SCN-157: a studio command is shown as typed — a value with a semicolon is one quoted argument", () => {
  assert.equal(
    shown(["change", "validate", "add-coupons; rm -rf ."]),
    "specgate change validate 'add-coupons; rm -rf .'",
  );
  assert.equal(shown(["check"]), "specgate check");
  assert.equal(shown(["answer", "Q2", "it's shipped"]), "specgate answer Q2 'it'\\''s shipped'");
});

test("REQ-056 SCN-161: 1,200 lines kept in order, and no more than 10,000", () => {
  const s = new Scrollback(10_000);
  for (let i = 1; i <= 1200; i++) s.push(`line ${i}\r\n`);
  const lines = s.text().split("\r\n").filter(Boolean);
  assert.equal(lines.length, 1200);
  assert.equal(lines[0], "line 1");
  assert.equal(lines[1199], "line 1200");
  const big = new Scrollback(10_000);
  for (let i = 1; i <= 12_000; i++) big.push(`l${i}\n`);
  const kept = big.text().split("\n").filter(Boolean);
  assert.equal(kept.length, 10_000);
  assert.equal(kept[0], "l2001");
  // A chunk split mid-line is kept whole.
  const part = new Scrollback(10);
  part.push("hel");
  part.push("lo\nwor");
  assert.equal(part.text(), "hello\nwor");
});

function terminals() {
  const port = new InMemoryPty();
  const t = new Terminals(port, {
    cwd: "/home/dev/sprich",
    shell: { file: "/bin/zsh", args: ["-l"], name: "zsh" },
  });
  const data: Array<[string, string]> = [];
  t.onData((id, d) => data.push([id, d]));
  return { port, t, data };
}

test("REQ-055 SCN-159: two terminals at once, each its own pty in the project's folder, named zsh 1 and zsh 2", () => {
  const { port, t, data } = terminals();
  const a = t.open(80, 24);
  const b = t.open(80, 24);
  assert.deepEqual(t.list(), [
    { id: a.id, name: "zsh 1" },
    { id: b.id, name: "zsh 2" },
  ]);
  assert.equal(port.spawned.length, 2);
  assert.deepEqual(
    port.spawned.map((s) => s.cwd),
    ["/home/dev/sprich", "/home/dev/sprich"],
  );
  t.input(b.id, "git status\r");
  port.spawned[0]!.pty.emit("npm test output\r\n");
  port.spawned[1]!.pty.emit("On branch feat/mvp-fase-1\r\n");
  assert.deepEqual(port.spawned[1]!.pty.written, ["git status\r"]);
  assert.deepEqual(data, [
    [a.id, "npm test output\r\n"],
    [b.id, "On branch feat/mvp-fase-1\r\n"],
  ]);
});

test("REQ-055 SCN-160: three terminals, the second closed — the first and third still running, their output in place", () => {
  const { port, t } = terminals();
  const [a, b, c] = [t.open(80, 24), t.open(80, 24), t.open(80, 24)];
  port.spawned[0]!.pty.emit("first\r\n");
  port.spawned[2]!.pty.emit("third\r\n");
  t.close(b.id);
  assert.equal(port.spawned[1]!.pty.killed, true);
  assert.equal(port.spawned[0]!.pty.killed || port.spawned[2]!.pty.killed, false);
  assert.deepEqual(
    t.list().map((x) => x.name),
    ["zsh 1", "zsh 3"],
  );
  assert.equal(t.scrollback(a.id), "first\r\n");
  assert.equal(t.scrollback(c.id), "third\r\n");
  assert.throws(() => t.input(b.id, "x"), /no terminal/);
});

test("REQ-056 SCN-162: one terminal's output never reaches another's scrollback", () => {
  const { port, t } = terminals();
  const [a, b] = [t.open(80, 24), t.open(80, 24)];
  port.spawned[0]!.pty.emit("commit 1a2b3c\r\n");
  port.spawned[1]!.pty.emit("✔ 182 tests\r\n");
  assert.equal(t.scrollback(a.id), "commit 1a2b3c\r\n");
  assert.equal(t.scrollback(b.id), "✔ 182 tests\r\n");
});

test("REQ-055: a shell that exits leaves the list, and its listeners are told its code", () => {
  const { port, t } = terminals();
  const exits: Array<[string, number]> = [];
  t.onExit((id, code) => exits.push([id, code]));
  const a = t.open(80, 24);
  port.spawned[0]!.pty.exit(0);
  assert.deepEqual(exits, [[a.id, 0]]);
  assert.deepEqual(t.list(), []);
});

test("REQ-055: closing every terminal waits for each shell to exit — on Windows a shell still running holds the project's folder", async () => {
  const { port, t } = terminals();
  t.open(80, 24);
  t.open(80, 24);
  let closed = false;
  const all = t.closeAll().then(() => (closed = true));
  assert.deepEqual(
    port.spawned.map((s) => s.pty.killed),
    [true, true],
  );
  port.spawned[0]!.pty.exit(0);
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(closed, false, "the second shell has not exited yet");
  port.spawned[1]!.pty.exit(0);
  await all;
  assert.equal(closed, true);
});

test("REQ-055: a shell that never exits does not keep the studio from closing", async () => {
  const port = new InMemoryPty();
  const t = new Terminals(
    port,
    { cwd: "/home/dev/sprich", shell: { file: "/bin/zsh", args: ["-l"], name: "zsh" } },
    { exitWaitMs: 20 },
  );
  t.open(80, 24);
  await t.closeAll();
  assert.equal(port.spawned[0]!.pty.killed, true);
});
