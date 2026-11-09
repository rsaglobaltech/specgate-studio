import { spawn } from "node:child_process";
import type { ProcessRunner } from "@specgate-studio/core";

export interface NodeProcessRunnerOptions {
  /** The executable: `node`, or a specgate binary. */
  program: string;
  /** Arguments before specgate's own, e.g. the path to specgate's bin script. */
  prefix: readonly string[];
  /** The open project. */
  projectDir: string;
}

/**
 * ProcessRunner over the specgate CLI (ADR-0003, adapter 1).
 *
 * Every value is one element of the argument array and no shell ever runs
 * (REQ-007), on Windows too. The project goes where specgate expects it:
 * `check [dir]` takes it as its positional argument, every other command as
 * `--project-dir`. Output is handed over chunk by chunk as it is written
 * (REQ-005).
 */
export class NodeProcessRunner implements ProcessRunner {
  constructor(private readonly options: NodeProcessRunnerOptions) {}

  run(args: readonly string[], onOutput: (chunk: string) => void): Promise<number> {
    const { program, prefix, projectDir } = this.options;
    const where = args[0] === "check" ? [projectDir] : ["--project-dir", projectDir];
    return new Promise((resolve) => {
      const child = spawn(program, [...prefix, ...args, ...where], {
        cwd: projectDir,
        shell: false,
        windowsHide: true,
        env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
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
