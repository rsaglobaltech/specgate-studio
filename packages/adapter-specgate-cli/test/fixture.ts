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

/**
 * A folder with code and no specgate files (draft-project-setup A4): a Node.js
 * project whose `src/` holds one source file per folder, a `test` script when
 * `tests` is true, committed. Inside a parent of its own: remove the parent.
 */
export function codeFolder(
  name: string,
  folders: readonly string[],
  opts: { tests?: boolean } = {},
): string {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "sg-setup-"));
  const dir = path.join(parent, name);
  fs.mkdirSync(dir);
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name, scripts: opts.tests ? { test: "node --test" } : {} }, null, 2) + "\n",
  );
  for (const f of folders) {
    fs.mkdirSync(path.join(dir, "src", f), { recursive: true });
    fs.writeFileSync(path.join(dir, "src", f, "index.js"), `export const ${f} = 1;\n`);
  }
  const git = (...a: string[]) =>
    spawnSync("git", ["-c", "user.name=T", "-c", "user.email=t@example.com", ...a], { cwd: dir });
  git("init", "-q");
  git("add", "-A");
  git("commit", "-qm", name);
  return dir;
}

/** Every file of a folder, relative with `/`, with its bytes; `.git` left out. */
export function snapshot(dir: string): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  const walk = (abs: string, rel: string) => {
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      if (e.name === ".git") continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(abs, e.name), r);
      else out.set(r, fs.readFileSync(path.join(abs, e.name)));
    }
  };
  walk(dir, "");
  return out;
}

/**
 * The PATH of this process with Claude Code on it, or with no `claude` at all:
 * a folder holding a `claude` that does nothing, for the agent adoption
 * detects (A8). Returns the PATH to restore and the folder to remove.
 */
export function withClaude(found: boolean): { restore: () => void } {
  const key = Object.keys(process.env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
  const before = process.env[key] ?? "";
  const names = ["claude", "claude.cmd", "claude.exe"];
  const kept = before
    .split(path.delimiter)
    .filter((d) => d && !names.some((n) => fs.existsSync(path.join(d, n))));
  let bin: string | null = null;
  if (found) {
    bin = fs.mkdtempSync(path.join(os.tmpdir(), "sg-claude-"));
    fs.writeFileSync(path.join(bin, "claude"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
    fs.writeFileSync(path.join(bin, "claude.cmd"), "@exit /b 0\r\n");
    kept.unshift(bin);
  }
  process.env[key] = kept.join(path.delimiter);
  return {
    restore: () => {
      process.env[key] = before;
      if (bin) fs.rmSync(bin, { recursive: true, force: true });
    },
  };
}
