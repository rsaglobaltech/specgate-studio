/**
 * Driven port: runs specgate with an argument array, in the project, without a
 * shell (REQ-007). Output is handed over as it is written; the promise is the
 * exit code. The Node adapter spawns the CLI; the in-process one calls its API.
 */
export interface ProcessRunner {
  run(
    args: readonly string[],
    onOutput: (chunk: string) => void,
  ): Promise<number>;
}
