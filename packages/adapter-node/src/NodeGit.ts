import { spawn } from "node:child_process";
import type { GitPort } from "@specgate-studio/core";

/** `git` with its arguments as an array, never a shell (REQ-007), in `cwd`. */
function git(cwd: string, args: readonly string[]): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    const child = spawn("git", ["-c", "core.quotepath=off", ...args], {
      cwd,
      shell: false,
      windowsHide: true,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", LC_ALL: "C" },
    });
    let out = "";
    child.stdout.setEncoding("utf8").on("data", (c: string) => (out += c));
    child.stderr.resume();
    child.on("error", () => resolve({ code: 127, out: "" }));
    child.on("close", (code) => resolve({ code: code ?? 1, out }));
  });
}

/**
 * GitPort over the `git` command (REQ-024, REQ-025). The uncommitted files are
 * read from `status --porcelain=v1 -z`, every untracked file listed: one entry
 * per file, a rename counted once under its new name. `GIT_OPTIONAL_LOCKS=0`
 * keeps the read from taking the index lock a commit may need.
 */
export class NodeGit implements GitPort {
  async branch(root: string): Promise<string | null> {
    const r = await git(root, ["symbolic-ref", "--short", "-q", "HEAD"]);
    return r.code === 0 && r.out.trim() ? r.out.trim() : null;
  }

  async uncommitted(root: string): Promise<string[] | null> {
    const r = await git(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
    if (r.code !== 0) return null;
    const entries = r.out.split("\0");
    const files: string[] = [];
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]!;
      if (e.length < 4) continue;
      files.push(e.slice(3));
      // A rename or copy is followed by its old name, which is not a file of its own.
      if (e[0] === "R" || e[0] === "C") i++;
    }
    return files;
  }
}
