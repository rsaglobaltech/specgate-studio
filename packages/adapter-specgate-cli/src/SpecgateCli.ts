import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import * as path from "node:path";
import type {
  Finding,
  Section,
  SectionData,
  SpecgateAnswer,
  SpecgatePort,
} from "@specgate-studio/core";

export interface SpecgateCliOptions {
  /** The executable: `node`, or a `specgate` on the PATH. */
  program: string;
  /** Arguments before specgate's own: the path to its bin script when `program` is node. */
  prefix: readonly string[];
  /** The open project. */
  projectDir: string;
}

/**
 * The command each section is read with (assumption A4 of draft-specgate-port).
 * The matrix with `--dry-run`: without it, specgate regenerates a derived
 * matrix on disk, and reading a section must not write the project.
 */
const SECTION_COMMAND: Record<Section, readonly string[]> = {
  home: ["status"],
  changes: ["change", "list"],
  questions: ["questions"],
  matrix: ["matrix", "--dry-run"],
  report: ["report"],
};

/** The specgate this repository depends on: its bin script. */
export function specgateBin(): string {
  const require = createRequire(import.meta.url);
  return path.join(
    path.dirname(require.resolve("@rsaglobaltech/specgate/package.json")),
    "bin",
    "specgate.js",
  );
}

/**
 * SpecgatePort over the specgate CLI (ADR-0003, adapter 1, REQ-012).
 *
 * Every command runs with `--json`, its arguments as an array and no shell;
 * its standard output is parsed as JSON. specgate's findings come back under
 * `status` and are returned apart from the data, with their code and fix — the
 * studio never reads specgate's prose.
 */
export class SpecgateCli implements SpecgatePort {
  constructor(private readonly options: SpecgateCliOptions) {}

  async version(): Promise<string> {
    const { stdout } = await this.exec(["--version"]);
    return stdout.trim();
  }

  async read(section: Section): Promise<SectionData> {
    return (await this.call(SECTION_COMMAND[section])).data;
  }

  async call(args: readonly string[]): Promise<SpecgateAnswer> {
    const where =
      args[0] === "check" ? [this.options.projectDir] : ["--project-dir", this.options.projectDir];
    const shown = `specgate ${[...args, "--json"].join(" ")}`;
    const { stdout, stderr, exitCode } = await this.exec([...args, "--json", ...where]);
    let parsed: unknown;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      const said = (stderr || stdout).trim().split("\n")[0] ?? "";
      throw new Error(`${shown} did not answer JSON (exit ${exitCode})${said ? `: ${said}` : ""}`);
    }
    const { status, ...data } = (parsed ?? {}) as { status?: Finding[] } & Record<string, unknown>;
    return { data, findings: Array.isArray(status) ? status : [], exitCode };
  }

  /** specgate with these arguments, in the project, without a shell. */
  private exec(
    args: readonly string[],
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const { program, prefix, projectDir } = this.options;
    return new Promise((resolve, reject) => {
      const child = spawn(program, [...prefix, ...args], {
        cwd: projectDir,
        shell: false,
        windowsHide: true,
        env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
      });
      let stdout = "";
      let stderr = "";
      child.stdout.setEncoding("utf8").on("data", (c: string) => (stdout += c));
      child.stderr.setEncoding("utf8").on("data", (c: string) => (stderr += c));
      child.on("error", reject);
      child.on("close", (code, signal) =>
        resolve({ stdout, stderr, exitCode: code ?? (signal ? 128 : 1) }),
      );
    });
  }
}
