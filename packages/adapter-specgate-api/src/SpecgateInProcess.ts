import { createRequire } from "node:module";
import type { Section, SectionData, SpecgateAnswer, SpecgatePort } from "@specgate-studio/core";

/** What the studio uses of `@rsaglobaltech/specgate/api` (specgate 0.32.0, API 1.x). */
export interface SpecgateApi {
  API_VERSION: string;
  status(dir: string): Promise<{ status: unknown[] }>;
  questions(dir: string): Promise<{ status: unknown[] }>;
  matrix(dir: string): Promise<{ status: unknown[] }>;
}

/** The sections specgate's API answers, by the function that reads each. */
const IN_PROCESS: Partial<
  Record<Section, keyof Pick<SpecgateApi, "status" | "questions" | "matrix">>
> = {
  home: "status",
  questions: "questions",
  matrix: "matrix",
};

/**
 * SpecgatePort in process (ADR-0003, adapter 2, REQ-014): the sections
 * specgate's public API answers are read by calling it, with no process; every
 * other section and every command goes to the CLI adapter it is given.
 */
export class SpecgateInProcess implements SpecgatePort {
  constructor(
    private readonly api: SpecgateApi,
    private readonly cli: SpecgatePort,
    private readonly projectDir: string,
    private readonly installed: string,
  ) {}

  async version(): Promise<string> {
    return this.installed;
  }

  async read(section: Section): Promise<SectionData> {
    const fn = IN_PROCESS[section];
    if (!fn) return this.cli.read(section);
    // As the CLI adapter: specgate's findings are not part of the data.
    const { status: _findings, ...data } = await this.api[fn](this.projectDir);
    return data;
  }

  call(args: readonly string[]): Promise<SpecgateAnswer> {
    return this.cli.call(args);
  }
}

/**
 * The in-process adapter over the specgate this repository depends on, or
 * null when that specgate publishes no API 1.x — the CLI adapter then reads
 * everything.
 */
export async function inProcessSpecgate(
  cli: SpecgatePort,
  projectDir: string,
): Promise<SpecgateInProcess | null> {
  try {
    const api = (await import("@rsaglobaltech/specgate/api")) as unknown as SpecgateApi;
    if (!/^1\./.test(api.API_VERSION)) return null;
    const require = createRequire(import.meta.url);
    const { version } = require("@rsaglobaltech/specgate/package.json") as { version: string };
    return new SpecgateInProcess(api, cli, projectDir, version);
  } catch {
    return null;
  }
}
