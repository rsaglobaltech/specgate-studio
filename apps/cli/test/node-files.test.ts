/**
 * Explorer's files on disk (draft-workbench REQ-032): the project's own, not
 * its dependencies, build output or what its .gitignore names (draft-workspace
 * REQ-022's rules); never a file outside the project.
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { NodeGit } from "@specgate-studio/adapter-node";
import { nodeFiles } from "../src/index.js";

test("REQ-032: Explorer lists the project's files — not node_modules, build output or the folders .gitignore names", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sg-files-"));
  try {
    const put = (rel: string) => {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), "x");
    };
    fs.writeFileSync(path.join(dir, ".gitignore"), "# local tooling\n.idea/\n/.harness/\n");
    for (const f of [
      "spec.md",
      "docs/brief.md",
      ".idea/vcs.xml",
      ".harness/events/x.json",
      "node_modules/a/index.js",
      "dist/app.js",
      "src/app.ts",
    ])
      put(f);
    const files = nodeFiles(dir);
    assert.deepEqual(await files.list(), [".gitignore", "docs/brief.md", "spec.md", "src/app.ts"]);
    await assert.rejects(files.read("../outside.txt"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/** A temporary project; a git repository when `git` (the tests that need git's own .gitignore). */
function project(git = false): string {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "sg-tree-")));
  if (git) execFileSync("git", ["init", "-q"], { cwd: dir });
  return dir;
}
const put = (dir: string, rel: string, text = "x") => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), text);
};

test("REQ-161 REQ-167 REQ-186 SCN-498: one folder's entries — the ignored marked, never left out; .gitignore's wildcards by git; the list without them", async () => {
  const dir = project(true);
  try {
    fs.writeFileSync(path.join(dir, ".gitignore"), ".idea/\n*.log\n!keep.log\n");
    for (const f of [
      "apps/web/src/index.ts",
      "apps/web/dist/index.js",
      "node_modules/x/index.js",
      ".idea/vcs.xml",
      "debug.log",
      "keep.log",
      "spec.md",
    ])
      put(dir, f);
    const files = nodeFiles(dir, { git: new NodeGit() });
    const names = async (rel: string) =>
      (await files.children!(rel))
        .map((e) => `${e.name}${e.dir ? "/" : ""}${e.ignored ? " (ignored)" : ""}`)
        .sort();
    assert.deepEqual(await names(""), [
      ".git/ (ignored)",
      ".gitignore",
      ".idea/ (ignored)",
      "apps/",
      "debug.log (ignored)",
      "keep.log",
      "node_modules/ (ignored)",
      "spec.md",
    ]);
    assert.deepEqual(await names("apps/web"), ["dist/ (ignored)", "src/"]);
    // Inside an ignored folder, everything is ignored too (REQ-186 SCN-553).
    assert.deepEqual(await names("node_modules"), ["x/ (ignored)"]);
    assert.ok(!(await files.list()).some((f) => /node_modules|dist|\.idea|debug\.log/.test(f)));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("REQ-166 SCN-492 SCN-491: create, rename, never overwrite; Delete to the trash, Shift+Delete for good", async () => {
  const dir = project();
  try {
    put(dir, "docs/notes.md", "notes");
    const trashed: string[] = [];
    const files = nodeFiles(dir, { trash: async (p) => void trashed.push(p) });
    await files.create!("docs/adr.md", false);
    assert.equal(fs.readFileSync(path.join(dir, "docs", "adr.md"), "utf8"), "");
    await files.create!("docs/decisions", true);
    assert.ok(fs.statSync(path.join(dir, "docs", "decisions")).isDirectory());
    await assert.rejects(files.create!("docs/adr.md", false), { code: "exists" });
    await files.rename!("docs/notes.md", "docs/notes-old.md");
    assert.equal(fs.readFileSync(path.join(dir, "docs", "notes-old.md"), "utf8"), "notes");
    await assert.rejects(files.rename!("docs/adr.md", "docs/notes-old.md"), { code: "exists" });
    await files.remove!("docs/notes-old.md", false);
    assert.deepEqual(trashed, [path.join(dir, "docs", "notes-old.md")]);
    await files.remove!("docs/adr.md", true);
    assert.equal(fs.existsSync(path.join(dir, "docs", "adr.md")), false);
    await assert.rejects(files.remove!("docs/gone.md", true), { code: "missing" });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("REQ-166 SCN-495: a link to a folder outside the project is never written through", async () => {
  const dir = project();
  const outside = project();
  try {
    put(dir, "spec.md");
    put(outside, "lib.ts");
    // A junction on Windows: no administrator needed.
    fs.symlinkSync(outside, path.join(dir, "vendor-link"), "junction");
    const files = nodeFiles(dir, { trash: async () => undefined });
    await assert.rejects(files.create!("vendor-link/a.md", false), { code: "outside" });
    assert.equal(fs.existsSync(path.join(outside, "a.md")), false);
    await assert.rejects(files.rename!("spec.md", "vendor-link/spec.md"), { code: "outside" });
    await assert.rejects(files.remove!("vendor-link/lib.ts", true), { code: "outside" });
    assert.ok(fs.existsSync(path.join(outside, "lib.ts")));
    await assert.rejects(files.create!("../escape.md", false), { code: "outside" });
    // The link itself is the project's: it can be listed.
    assert.ok((await files.children!("")).some((e) => e.name === "vendor-link" && e.dir));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});
