import { spawn } from "node:child_process";
import { promises as fsp } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { FoldersPort, ProgramPort } from "@specgate-studio/core";

/**
 * The Developer's folders on this machine (draft-workbench-v2 REQ-185): their
 * home, the folders inside one — links to folders included — and the
 * platform's own paths, `C:\` and `\\server\share` on Windows.
 */
export class NodeFolders implements FoldersPort {
  constructor(private readonly homeDir: string = os.homedir()) {}

  home(): string {
    return this.homeDir;
  }

  async folders(dir: string): Promise<string[]> {
    const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
    const out: string[] = [];
    for (const e of entries) {
      let isDir = e.isDirectory();
      if (e.isSymbolicLink())
        isDir = await fsp.stat(path.join(dir, e.name)).then(
          (s) => s.isDirectory(),
          () => false,
        );
      if (isDir) out.push(e.name);
    }
    return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }

  parent(dir: string): string | null {
    const up = path.dirname(dir);
    return up === dir ? null : up;
  }

  join(dir: string, name: string): string {
    return path.join(dir, name);
  }

  async exists(p: string): Promise<boolean> {
    return fsp.lstat(p).then(
      () => true,
      () => false,
    );
  }
}

/**
 * A program run with its arguments as an array, never through a shell
 * (REQ-007): `gh` and `git` for Clone Repository (REQ-185). Its output comes
 * as it is written; it resolves with the exit code, 127 when it is not there.
 */
export class NodePrograms implements ProgramPort {
  run(
    program: string,
    args: readonly string[],
    cwd: string,
    onOutput: (chunk: string) => void,
  ): Promise<number> {
    return new Promise((resolve) => {
      const child = spawn(program, [...args], {
        cwd,
        shell: false,
        windowsHide: true,
        // No prompt can be answered here: git and gh fail instead of waiting.
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GH_PROMPT_DISABLED: "1", NO_COLOR: "1" },
        stdio: ["ignore", "pipe", "pipe"],
      });
      child.stdout.setEncoding("utf8").on("data", onOutput);
      child.stderr.setEncoding("utf8").on("data", onOutput);
      child.on("error", (e) => {
        onOutput(`${e.message}\n`);
        resolve(127);
      });
      child.on("close", (code, signal) => resolve(code ?? (signal ? 128 : 1)));
    });
  }
}
