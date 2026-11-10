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
