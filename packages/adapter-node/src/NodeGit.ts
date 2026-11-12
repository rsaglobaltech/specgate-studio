import { spawn } from "node:child_process";
import type { GitPort, GitWriter } from "@specgate-studio/core";

/**
 * `git` with its arguments as an array, never a shell (REQ-007), in `cwd`;
 * `input` written to its standard input, `onOutput` given what it says.
 */
function git(
  cwd: string,
  args: readonly string[],
  opts: { input?: string; onOutput?: (chunk: string) => void } = {},
): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    const child = spawn("git", ["-c", "core.quotepath=off", ...args], {
      cwd,
      shell: false,
      windowsHide: true,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", LC_ALL: "C" },
    });
    let out = "";
    child.stdout.setEncoding("utf8").on("data", (c: string) => {
      out += c;
      opts.onOutput?.(c);
    });
    child.stderr.setEncoding("utf8").on("data", (c: string) => opts.onOutput?.(c));
    child.stdin.on("error", () => undefined);
    child.stdin.end(opts.input ?? "");
    child.on("error", (e) => {
      opts.onOutput?.(`${e.message}\n`);
      resolve({ code: 127, out: "" });
    });
    child.on("close", (code) => resolve({ code: code ?? 1, out }));
  });
}

/** Paths for `--pathspec-from-file=- --pathspec-file-nul`: no length limit, no shell, any name. */
const pathspec = (files: readonly string[]) => files.map((f) => `${f}\0`).join("");
const LITERAL = ["--pathspec-from-file=-", "--pathspec-file-nul"];

/**
 * GitPort over the `git` command (REQ-024, REQ-025). The uncommitted files are
 * read from `status --porcelain=v1 -z`, every untracked file listed: one entry
 * per file, a rename counted once under its new name. `GIT_OPTIONAL_LOCKS=0`
 * keeps the read from taking the index lock a commit may need.
 *
 * GitWriter (draft-build-live REQ-102): a commit of exactly the files shown —
 * their paths handed over on standard input, so 325 of them, or one named
 * like a flag, are neither too long for the command line nor read as options —
 * and a stash with the untracked files.
 */
export class NodeGit implements GitPort, GitWriter {
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

  /** Each uncommitted file with its two letters (draft-explorer-tree REQ-163). */
  async changes(root: string): Promise<Record<string, string> | null> {
    const r = await git(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
    if (r.code !== 0) return null;
    const entries = r.out.split("\0");
    const out: Record<string, string> = {};
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]!;
      if (e.length < 4) continue;
      out[e.slice(3)] = e.slice(0, 2);
      if (e[0] === "R" || e[0] === "C") i++;
    }
    return out;
  }

  /**
   * Of these paths, those git ignores (A18): `check-ignore` reads them on
   * standard input, NUL-separated, so any name and any number of them are
   * safe; wildcards and `!` in .gitignore are git's to read. Outside a
   * repository none is ignored.
   */
  async ignored(root: string, paths: readonly string[]): Promise<Set<string>> {
    if (paths.length === 0) return new Set();
    const r = await git(root, ["check-ignore", "-z", "--stdin"], { input: pathspec(paths) });
    // 0: some are ignored; 1: none is; anything else: not a repository.
    if (r.code !== 0) return new Set();
    return new Set(r.out.split("\0").filter(Boolean));
  }

  /** The last `n` commits, newest first (draft-design-conformance A9). */
  async log(root: string, n: number): Promise<Array<{ at: number; subject: string }> | null> {
    const r = await git(root, ["log", `-n${Math.max(1, Math.floor(n))}`, "--format=%ct%x1f%s%x1e"]);
    if (r.code !== 0) return null;
    return r.out
      .split("\x1e")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [at, subject] = l.split("\x1f");
        return { at: Number(at) || 0, subject: subject ?? "" };
      });
  }

  async commit(
    root: string,
    files: readonly string[],
    message: string,
    onOutput: (chunk: string) => void,
  ): Promise<number> {
    const input = pathspec(files);
    // `-A` stages a deleted file's removal as well as a new or changed one.
    const add = await git(root, ["add", "-A", ...LITERAL], { input, onOutput });
    if (add.code !== 0) return add.code;
    // Only these paths: whatever else was staged stays staged, uncommitted.
    const commit = await git(root, ["commit", "-m", message, ...LITERAL], { input, onOutput });
    return commit.code;
  }

  async stash(root: string, message: string, onOutput: (chunk: string) => void): Promise<number> {
    const r = await git(root, ["stash", "push", "--include-untracked", "-m", message], {
      onOutput,
    });
    return r.code;
  }
}
