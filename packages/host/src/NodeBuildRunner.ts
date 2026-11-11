import { spawn } from "node:child_process";
import type { BuildPort, BuildProcess } from "@specgate-studio/core";
import { killTree } from "./killTree.js";

export interface NodeBuildRunnerOptions {
  /** The executable: `node`, or a specgate binary. */
  program: string;
  /** Arguments before specgate's own: the path to its bin script when `program` is node. */
  prefix: readonly string[];
  /** The open project. */
  projectDir: string;
}

/**
 * BuildPort over the specgate CLI (draft-build-live A5): `specgate harness
 * run` with its arguments as an array and no shell (REQ-007). Its standard
 * error streams to the studio as it is written; its standard output is the
 * JSON report, given whole when it ends. Stopping it ends the whole tree of
 * processes it started — the agent, its tests, the servers they start — on
 * Windows with `taskkill /T`, elsewhere by its process group and every
 * descendant (REQ-105).
 */
export class NodeBuildRunner implements BuildPort {
  constructor(private readonly options: NodeBuildRunnerOptions) {}

  start(args: readonly string[], onOutput: (chunk: string) => void): BuildProcess {
    const { program, prefix, projectDir } = this.options;
    const child = spawn(program, [...prefix, ...args, "--project-dir", projectDir], {
      cwd: projectDir,
      shell: false,
      windowsHide: true,
      // Its own process group, so stopping it reaches every process it started.
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
    });
    let stdout = "";
    child.stdout!.setEncoding("utf8").on("data", (c: string) => (stdout += c));
    child.stderr!.setEncoding("utf8").on("data", onOutput);
    const done = new Promise<{ exitCode: number; stdout: string }>((resolve) => {
      let settled = false;
      const end = (code: number) => {
        if (settled) return;
        settled = true;
        resolve({ exitCode: code, stdout });
      };
      child.on("error", (e) => {
        onOutput(`${e.message}\n`);
        end(127);
      });
      child.on("close", (code, signal) => end(code ?? (signal ? 128 : 1)));
      // A process it left behind may hold its output open: the exit is the end, a moment later.
      child.on("exit", (code, signal) =>
        setTimeout(() => end(code ?? (signal ? 128 : 1)), 2_000).unref(),
      );
    });
    return {
      done,
      stop: async () => {
        if (child.pid !== undefined && child.exitCode === null && child.signalCode === null)
          await killTree(child.pid);
        await done;
      },
    };
  }
}
