import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/** A temp folder, `/` separated, with its realpath (macOS /var → /private/var). */
export function tmp(prefix: string): string {
  return fs
    .realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)))
    .split(path.sep)
    .join("/");
}

export function write(root: string, rel: string, text = "x\n"): void {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
}

export function gitIn(root: string, ...args: string[]): string {
  const r = spawnSync(
    "git",
    ["-c", "user.name=T", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", ...args],
    { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
  );
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout;
}

/** A repository on `branch` whose first commit holds `committed`. */
export function repo(root: string, branch: string, committed: string[] = ["README.md"]): void {
  gitIn(root, "init", "-q", "-b", branch);
  for (const f of committed) write(root, f);
  gitIn(root, "add", "-A");
  gitIn(root, "commit", "-qm", "init");
}

/**
 * Remove a test folder. On Windows a closed watch frees its folder a moment
 * later, on the event loop: retry while it is busy, waiting between tries.
 */
export const rm = (root: string) =>
  fs.promises.rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });

export async function until(ok: () => boolean, ms: number): Promise<boolean> {
  const end = Date.now() + ms;
  while (!ok() && Date.now() < end) await new Promise((r) => setTimeout(r, 5));
  return ok();
}
