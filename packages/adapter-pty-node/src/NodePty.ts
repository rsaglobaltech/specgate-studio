import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import type { Pty, PtyOptions, PtyPort } from "@specgate-studio/core";

type NodePtyModule = typeof import("@lydell/node-pty");
const nodePty = createRequire(import.meta.url)("@lydell/node-pty") as NodePtyModule;

/**
 * PtyPort over node-pty (draft-terminal A10): one adapter for the desktop
 * sidecar and the web host, on macOS, Windows (ConPTY) and Linux. The
 * prebuilt `@lydell/node-pty` needs no compiler and no install script.
 */
export class NodePty implements PtyPort {
  spawn(o: PtyOptions): Pty {
    const p = nodePty.spawn(o.shell.file, o.shell.args, {
      name: "xterm-256color",
      cols: o.cols,
      rows: o.rows,
      cwd: o.cwd,
      env: { ...process.env, TERM: "xterm-256color", COLORTERM: "truecolor" } as Record<
        string,
        string
      >,
    });
    return {
      write: (data) => p.write(data),
      resize: (cols, rows) => p.resize(Math.max(1, cols), Math.max(1, rows)),
      onData: (listener) => void p.onData(listener),
      onExit: (listener) => void p.onExit(({ exitCode }) => listener(exitCode)),
      kill: () => {
        try {
          p.kill();
        } catch {
          // Already gone.
        }
      },
    };
  }
}

/** Whether a program is on the PATH: `pwsh` decides the Windows shell (A1). */
export function hasProgram(program: string): boolean {
  const finder = process.platform === "win32" ? "where" : "which";
  return spawnSync(finder, [program], { stdio: "ignore", windowsHide: true }).status === 0;
}
