/**
 * A real specgate project for the adapter's tests: made by `specgate init`,
 * with the draft `draft-orders` and its two open questions, committed.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { specgateBin } from "../src/index.js";

const FIXTURES = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "test",
  "fixtures",
);

/** A specgate project made by `specgate init`, with the draft `draft-orders` and its two open questions, committed. */
export function shop(): string {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "sg-port-"));
  const bin = specgateBin();
  const init = spawnSync(
    process.execPath,
    [
      bin,
      "init",
      "--config",
      path.join(FIXTURES, "project.yaml"),
      "--out",
      parent,
      "--no-git",
      "--no-agents",
      "--no-ci",
    ],
    { encoding: "utf8" },
  );
  assert.equal(init.status, 0, init.stdout + init.stderr);
  const dir = path.join(parent, "my-spec-driven-app");
  const changes = path.join(dir, "docs", "specs", "changes");
  fs.mkdirSync(changes, { recursive: true });
  fs.cpSync(path.join(FIXTURES, "draft-orders"), path.join(changes, "draft-orders"), {
    recursive: true,
  });
  const git = (...a: string[]) =>
    spawnSync("git", ["-c", "user.name=T", "-c", "user.email=t@example.com", ...a], { cwd: dir });
  git("init", "-q");
  git("add", "-A");
  git("commit", "-qm", "the shop");
  return dir;
}
