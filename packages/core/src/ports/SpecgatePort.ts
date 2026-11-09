import type { Finding } from "../domain/finding.js";
import type { SectionReader } from "./SectionReader.js";

/** A command's answer: its data, specgate's findings, and its exit code. */
export interface SpecgateAnswer<T = unknown> {
  data: T;
  findings: Finding[];
  exitCode: number;
}

/**
 * Driven port: the only way the core reaches specgate (ADR-0003, REQ-011).
 * Adapter 1 runs the CLI with `--json`; adapter 2 will call specgate's API in
 * process. Both pass the same contract tests (REQ-015).
 */
export interface SpecgatePort extends SectionReader {
  /** The installed specgate's version, e.g. `0.31.0`. */
  version(): Promise<string>;
  /** Run a command the port offers, `--json`, and return what it answered. */
  call(args: readonly string[]): Promise<SpecgateAnswer>;
}
