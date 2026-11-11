/**
 * Driven port: a build — `specgate harness run` — as a process the studio
 * started and may stop (draft-build-live A5, REQ-105). Its standard error is
 * handed over as it is written; its standard output is specgate's JSON
 * report, given whole when it ends.
 */
export interface BuildProcess {
  /** When the process and every process it started have ended. */
  done: Promise<{ exitCode: number; stdout: string }>;
  /** End it and every process it started — its agent, tests, servers — and wait for them. */
  stop(): Promise<void>;
}

export interface BuildPort {
  start(args: readonly string[], onOutput: (chunk: string) => void): BuildProcess;
}
