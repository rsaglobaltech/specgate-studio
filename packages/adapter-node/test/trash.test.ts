/**
 * The system's trash (draft-explorer-tree REQ-166, A24): Delete moves a file
 * there on each system, with the path never in a script or a shell's line.
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { freedesktopTrash, systemTrash, type Exec } from "../src/index.js";

function temp(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sg-trash-"));
}

function recorder(code = 0) {
  const calls: Array<{ program: string; args: string[]; env?: Record<string, string> }> = [];
  const exec: Exec = async (program, args, env) => {
    calls.push({ program, args: [...args], ...(env ? { env: { ...env } } : {}) });
    return code;
  };
  return { calls, exec };
}

test("REQ-166 SCN-493: on macOS the note goes to Finder's trash, its path an argument of its own", async () => {
  const dir = temp();
  try {
    // A name a shell would split or run — and one Windows allows.
    const note = path.join(dir, "it's notes; rm -rf ~ $(x).md");
    fs.writeFileSync(note, "x");
    const r = recorder();
    await systemTrash({ platform: "darwin", exec: r.exec })(note);
    assert.equal(r.calls.length, 1);
    assert.equal(r.calls[0]!.program, "osascript");
    assert.equal(r.calls[0]!.args.at(-1), note, "the path is argv, not script text");
    assert.ok(!r.calls[0]!.args.slice(0, -1).join(" ").includes("rm -rf"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("REQ-166 SCN-493: on Windows the Recycle Bin, the path in the environment, never in the script", async () => {
  const dir = temp();
  try {
    const note = path.join(dir, "notes.md");
    fs.writeFileSync(note, "x");
    const r = recorder();
    await systemTrash({ platform: "win32", exec: r.exec })(note);
    const call = r.calls[0]!;
    assert.equal(call.program, "powershell.exe");
    assert.ok(call.args.includes("-NoProfile"));
    assert.match(
      call.args.at(-1)!,
      /DeleteFile\(\$env:SPECGATE_STUDIO_TRASH, 'OnlyErrorDialogs', 'SendToRecycleBin'\)/,
    );
    assert.ok(!call.args.join(" ").includes(note));
    assert.equal(call.env?.SPECGATE_STUDIO_TRASH, note);
    // A folder goes with DeleteDirectory.
    const r2 = recorder();
    await systemTrash({ platform: "win32", exec: r2.exec })(dir);
    assert.match(r2.calls[0]!.args.at(-1)!, /DeleteDirectory/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("REQ-166 SCN-493: on Linux `gio trash`; without it, the freedesktop.org trash by hand", async () => {
  const dir = temp();
  try {
    const note = path.join(dir, "notes.md");
    fs.writeFileSync(note, "x");
    const gio = recorder(0);
    await systemTrash({ platform: "linux", exec: gio.exec })(note);
    assert.deepEqual(gio.calls[0], { program: "gio", args: ["trash", "--", note] });

    // No gio: the file moves into $XDG_DATA_HOME/Trash with its .trashinfo.
    const data = path.join(dir, "share");
    await systemTrash({
      platform: "linux",
      exec: recorder(127).exec,
      env: { XDG_DATA_HOME: data },
      now: () => new Date("2026-11-12T10:00:00Z"),
    })(note);
    assert.equal(fs.existsSync(note), false);
    assert.equal(fs.readFileSync(path.join(data, "Trash", "files", "notes.md"), "utf8"), "x");
    const info = fs.readFileSync(path.join(data, "Trash", "info", "notes.md.trashinfo"), "utf8");
    assert.match(info, /^\[Trash Info\]\nPath=.*notes\.md\nDeletionDate=2026-11-12T10:00:00\n$/);
    // A second notes.md does not replace the first.
    fs.writeFileSync(note, "y");
    await freedesktopTrash(note, { XDG_DATA_HOME: data }, dir, new Date());
    assert.equal(fs.readFileSync(path.join(data, "Trash", "files", "notes.md.2"), "utf8"), "y");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("REQ-166: a trash that refuses deletes nothing", async () => {
  const dir = temp();
  try {
    const note = path.join(dir, "notes.md");
    fs.writeFileSync(note, "x");
    await assert.rejects(systemTrash({ platform: "darwin", exec: recorder(1).exec })(note));
    assert.equal(fs.existsSync(note), true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
