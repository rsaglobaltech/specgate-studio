import {
  commandLine,
  shown,
  type CommandLine,
  type CommandEvent,
  type RunResult,
  type SpecgateCommand,
} from "../domain/command.js";
import type { ProcessRunner } from "../ports/ProcessRunner.js";
import { notice, type ActionId, type HelpVars } from "../domain/help.js";
import { CI_GATE, HARNESS_CONFIG, initArgs } from "../domain/setup.js";

export interface CommandsOptions {
  /** What the notices name: the next requirement to apply, the change… (REQ-063). */
  helpVars?: () => HelpVars;
}

/**
 * The commands whose closing notice is known from their exit code alone —
 * what they write is fixed — with what the notice names. The others get
 * theirs when they report it.
 */
function noticed(
  c: SpecgateCommand,
): { action: ActionId; written: string[]; vars: HelpVars } | null {
  switch (c.name) {
    case "check":
      return { action: "check", written: [], vars: {} };
    case "answer":
      return {
        action: "answer",
        written: [
          `docs/specs/changes/${c.change}/questions.md`,
          `docs/specs/changes/${c.change}/assumptions.md`,
        ],
        vars: { q: c.q, change: c.change },
      };
    case "change-note":
      return {
        action: "ask-change",
        written: [`docs/specs/changes/${c.change}/review.md`],
        vars: {
          change: c.change,
          module: c.change.replace(/^draft-/, ""),
          ...(c.req ? { req: c.req } : {}),
        },
      };
    case "adopt":
      return {
        action: "adopt",
        written: [
          "spec.md",
          "AGENTS.md",
          "features/adoption/baseline.feature",
          "docs/specs/traceability.md",
        ],
        vars: {},
      };
    case "agents-init":
      return { action: "agents-init", written: [HARNESS_CONFIG], vars: {} };
    case "ci-init":
      return { action: "ci-init", written: [CI_GATE], vars: {} };
    default:
      return null;
  }
}

type Known = ReturnType<typeof noticed>;

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

  constructor(
    private readonly runner: ProcessRunner,
    private readonly options: CommandsOptions = {},
  ) {}

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
    return this.exec(line, noticed(command));
  }

  /**
   * `specgate init` with the five answers' config, into `out` (draft-project-setup
   * REQ-111): told and guarded as any write. The host builds the config; the
   * wire never names a path for it.
   */
  runInit(config: string, out: string, git: boolean): Promise<RunResult> {
    return this.exec(
      { args: initArgs(config, out, git), write: true },
      { action: "init", written: ["spec.md", "docs/specs/traceability.md"], vars: {} },
    );
  }

  private async exec(line: CommandLine, known: Known): Promise<RunResult> {
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
      if (known) {
        const vars = { ...(this.options.helpVars?.() ?? {}), ...known.vars };
        const outcome = { exitCode, findings: [], written: known.written };
        this.emit({
          type: "ended",
          run,
          exitCode,
          notice: {
            en: notice(known.action, "en", vars, outcome),
            es: notice(known.action, "es", vars, outcome),
          },
        });
      } else this.emit({ type: "ended", run, exitCode });
      const written = exitCode === 0 ? (known?.written ?? []) : [];
      return { ok: true, run, exitCode, written };
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
