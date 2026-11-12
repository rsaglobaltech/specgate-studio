import { execFile } from "node:child_process";
import { promises as fsp } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/** Runs a program with its arguments as an array, never a shell (REQ-007); resolves its exit code. */
export type Exec = (
  program: string,
  args: readonly string[],
  env?: Readonly<Record<string, string>>,
) => Promise<number>;

const exec: Exec = (program, args, env) =>
  new Promise((resolve) => {
    execFile(
      program,
      [...args],
      { shell: false, windowsHide: true, env: { ...process.env, ...env }, timeout: 30_000 },
      (error) => resolve(error ? (typeof error.code === "number" ? error.code : 1) : 0),
    );
  });

/** Moves a file or folder to the system's trash; rejects, deleting nothing, when it cannot. */
export type Trash = (absolutePath: string) => Promise<void>;

/**
 * The system's trash, safely on each system (draft-explorer-tree A24). The
 * path is never put in a script or a command line a shell reads:
 *
 * - macOS: Finder deletes it — `osascript` with the path as its own argument
 *   (`on run argv`), so Finder's "Put Back" can restore it.
 * - Windows: the Recycle Bin, through .NET's `FileSystem.DeleteFile` /
 *   `DeleteDirectory` with `SendToRecycleBin`, run by `powershell.exe
 *   -NoProfile`; the path travels in an environment variable, not in the
 *   script.
 * - Linux and the rest: `gio trash`; without it, the freedesktop.org trash
 *   by hand — the file moved to `$XDG_DATA_HOME/Trash/files` with its
 *   `.trashinfo` — when it is on the same file system.
 *
 * When no trash is reachable it rejects and nothing is deleted.
 */
export function systemTrash(
  options: {
    platform?: NodeJS.Platform;
    exec?: Exec;
    env?: NodeJS.ProcessEnv;
    home?: string;
    now?: () => Date;
  } = {},
): Trash {
  const platform = options.platform ?? process.platform;
  const run = options.exec ?? exec;
  const env = options.env ?? process.env;
  return async (target) => {
    const stat = await fsp.lstat(target);
    if (platform === "darwin") {
      const code = await run("osascript", [
        "-e",
        "on run argv",
        "-e",
        'tell application "Finder" to delete (POSIX file (item 1 of argv) as alias)',
        "-e",
        "end run",
        target,
      ]);
      if (code !== 0) throw new Error("Finder could not move it to the trash");
      return;
    }
    if (platform === "win32") {
      const what = stat.isDirectory() ? "DeleteDirectory" : "DeleteFile";
      const script =
        "Add-Type -AssemblyName Microsoft.VisualBasic; " +
        `[Microsoft.VisualBasic.FileIO.FileSystem]::${what}($env:SPECGATE_STUDIO_TRASH, ` +
        "'OnlyErrorDialogs', 'SendToRecycleBin')";
      const code = await run(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-Command", script],
        { SPECGATE_STUDIO_TRASH: target },
      );
      if (code !== 0) throw new Error("the Recycle Bin could not take it");
      return;
    }
    if ((await run("gio", ["trash", "--", target])) === 0) return;
    await freedesktopTrash(
      target,
      env,
      options.home ?? os.homedir(),
      options.now ?? (() => new Date()),
    );
  };
}

/**
 * The freedesktop.org trash by hand (Trash spec 1.0): the `.trashinfo`
 * written first, with a name no other entry has, then the file moved in
 * with one rename — never copied, so a different file system refuses
 * instead of half-moving it.
 */
export async function freedesktopTrash(
  target: string,
  env: NodeJS.ProcessEnv,
  home: string,
  now: Date | (() => Date),
): Promise<void> {
  const data = env.XDG_DATA_HOME || path.join(home, ".local", "share");
  const trash = path.join(data, "Trash");
  await fsp.mkdir(path.join(trash, "files"), { recursive: true, mode: 0o700 });
  await fsp.mkdir(path.join(trash, "info"), { recursive: true, mode: 0o700 });
  const base = path.basename(target);
  const when = (typeof now === "function" ? now() : now).toISOString().slice(0, 19);
  for (let n = 1; n < 1000; n++) {
    const name = n === 1 ? base : `${base}.${n}`;
    const info = path.join(trash, "info", `${name}.trashinfo`);
    try {
      await fsp.writeFile(
        info,
        `[Trash Info]\nPath=${encodeURI(target).replace(/[?#]/g, encodeURIComponent)}\nDeletionDate=${when}\n`,
        { flag: "wx" },
      );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "EEXIST") continue;
      throw e;
    }
    try {
      await fsp.rename(target, path.join(trash, "files", name));
      return;
    } catch (e) {
      await fsp.rm(info, { force: true });
      throw new Error(
        (e as NodeJS.ErrnoException).code === "EXDEV"
          ? "the trash is on another file system"
          : `the trash could not take it: ${(e as Error).message}`,
      );
    }
  }
  throw new Error("the trash has too many entries of that name");
}
