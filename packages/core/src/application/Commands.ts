import {
  commandLine,
  shown,
  type CommandEvent,
  type RunResult,
  type SpecgateCommand,
} from "../domain/command.js";
import type { ProcessRunner } from "../ports/ProcessRunner.js";

export type EventListener = (event: CommandEvent) => void;

/**
 * Runs specgate commands for the UI.
 *
 * Every run is told as events — started, each chunk of output, ended with its
 * exit code (REQ-005). While a write runs, another write is refused with
 * `write_busy`, naming the one that runs (REQ-006); reads still run. A name
 * the port does not offer is refused with `command_unknown` before any process
 * starts (REQ-016).
 */
export class Commands {
  private next = 1;
  private writing: string | null = null;
  private readonly listeners = new Set<EventListener>();

  constructor(private readonly runner: ProcessRunner) {}

  async run(command: SpecgateCommand): Promise<RunResult> {
    const line = commandLine(command);
    if (!line) {
      const name = String((command as { name?: unknown } | null)?.name);
      return {
        ok: false,
        code: "command_unknown",
        message: `specgate has no command ${JSON.stringify(name)} the studio may run.`,
      };
    }
    if (line.write && this.writing) {
      return {
        ok: false,
        code: "write_busy",
        message: `${this.writing} is running: wait for it to end.`,
      };
    }
    const run = this.next++;
    const text = shown(line.args);
    if (line.write) this.writing = text;
    try {
      this.emit({ type: "started", run, command: text });
      const exitCode = await this.runner.run(line.args, (chunk) =>
        this.emit({ type: "output", run, chunk }),
      );
      this.emit({ type: "ended", run, exitCode });
      return { ok: true, run, exitCode };
    } finally {
      if (line.write) this.writing = null;
    }
  }

  onEvent(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: CommandEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
