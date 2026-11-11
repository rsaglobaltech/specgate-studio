import {
  commandLine,
  shown,
  type CommandLine,
  type CommandEvent,
  type RunResult,
  type SpecgateCommand,
} from "../domain/command.js";
import type { ProcessRunner } from "../ports/ProcessRunner.js";
import type { SpecgatePort } from "../ports/SpecgatePort.js";
import type { Finding } from "../domain/finding.js";
import { notice, type ActionId, type HelpVars, type Outcome } from "../domain/help.js";
import { briefCheckOutcome, draftWritten } from "../domain/brief.js";
import { archivePreviewOf, archiveWritten, findingLine } from "../domain/changes.js";
import { CI_GATE, HARNESS_CONFIG, initArgs } from "../domain/setup.js";

export interface CommandsOptions {
  /** What the notices name: the next requirement to apply, the change… (REQ-063). */
  helpVars?: () => HelpVars;
  /**
   * specgate answering `--json`: the commands whose notice needs what they did
   * and their findings run through it (draft-changes). Without it they stream
   * through the runner, as before, with no notice they cannot know.
   */
  json?: Pick<SpecgatePort, "call">;
  /** The files a command wrote that its answer does not list: Apply's delta (REQ-086). */
  written?: (command: SpecgateCommand, data: unknown) => Promise<string[]>;
}

/** The files an answer writes: its change's, or the project's for `project` (A4). */
const answerFiles = (change: string) =>
  change === "project"
    ? ["docs/specs/questions.md", "docs/specs/assumptions.md"]
    : [`docs/specs/changes/${change}/questions.md`, `docs/specs/changes/${change}/assumptions.md`];

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
        written: answerFiles(c.change),
        vars: { q: c.q, change: c.change },
      };
    case "answer-reviewed":
      return {
        action: "answer-reviewed",
        written: answerFiles(c.change),
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

/** The commands run with `--json`: the action their notice is, what it names, and how it ended. */
function answered(c: SpecgateCommand): {
  action: ActionId;
  vars: HelpVars;
  /** How it ended when its answer says it otherwise than its exit code and findings. */
  outcome?: (data: unknown, findings: Finding[], exitCode: number) => Outcome;
} | null {
  switch (c.name) {
    case "brief-check":
      return { action: "brief-check", vars: {}, outcome: briefCheckOutcome };
    case "draft-module":
      return { action: "draft-modules", vars: { module: c.module, agent: c.agent } };
    case "apply":
      return { action: "apply", vars: { req: c.req } };
    case "archive":
      return { action: "archive", vars: { change: c.change } };
    case "archive-preview":
      return { action: "archive-preview", vars: { change: c.change } };
    case "propose-ticket":
      return { action: "propose-ticket", vars: { key: c.key } };
    default:
      return null;
  }
}

/** What a `--json` command wrote, from its answer. */
function writtenIn(c: SpecgateCommand, data: unknown): string[] {
  if (c.name === "archive") return archiveWritten(data);
  if (c.name === "draft-module") return draftWritten(data);
  if (c.name === "propose-ticket") {
    const created = (data as { created?: unknown } | null)?.created;
    return Array.isArray(created)
      ? created.filter((f) => typeof f === "string").map((f: string) => f.replace(/\\/g, "/"))
      : [];
  }
  return [];
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
    return this.exec(line, noticed(command), command);
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

  private async exec(
    line: CommandLine,
    known: Known,
    command?: SpecgateCommand,
  ): Promise<RunResult> {
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
      if (line.json && this.options.json && command)
        return await this.runJson(command, line.args, run, text);
      this.emit({ type: "started", run, command: text });
      const exitCode = await this.runner.run(line.args, (chunk) =>
        this.emit({ type: "output", run, chunk }),
      );
      if (known) {
        const vars = { ...(this.options.helpVars?.() ?? {}), ...known.vars };
        // A run that failed is not said to have written its files.
        const outcome = { exitCode, findings: [], written: exitCode === 0 ? known.written : [] };
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

  /**
   * A command whose answer says what it did: run with `--json` through the
   * port, its findings told as output, its notice from those findings and the
   * files it wrote (draft-changes, help REQ-063). The command is shown as the
   * person would type it: `--json`, like `--project-dir`, is the adapter's.
   */
  private async runJson(
    command: SpecgateCommand,
    args: readonly string[],
    run: number,
    text: string,
  ): Promise<RunResult> {
    this.emit({ type: "started", run, command: text });
    let data: unknown = null;
    let findings: Finding[] = [];
    let exitCode: number;
    try {
      const answer = await this.options.json!.call(args);
      ({ data, findings, exitCode } = answer);
    } catch (e) {
      this.emit({ type: "output", run, chunk: `${e instanceof Error ? e.message : String(e)}\n` });
      exitCode = 1;
    }
    for (const f of findings) this.emit({ type: "output", run, chunk: findingLine(f) });
    const refused = findings.some((f) => f.severity === "error");
    const written =
      exitCode === 0 && !refused
        ? [
            ...writtenIn(command, data),
            ...((await this.options.written?.(command, data).catch(() => [])) ?? []),
          ]
        : [];
    const preview = command.name === "archive-preview" ? archivePreviewOf(data) : null;
    // What it did, from its answer: the terminal says it as the notice does.
    for (const f of written) this.emit({ type: "output", run, chunk: `  wrote ${f}\n` });
    for (const w of preview?.writes ?? [])
      this.emit({ type: "output", run, chunk: `  would write ${w.file}\n` });
    const known = answered(command);
    if (known) {
      const vars = { ...(this.options.helpVars?.() ?? {}), ...known.vars };
      const outcome = known.outcome?.(data, findings, exitCode) ?? { exitCode, findings, written };
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
    return {
      ok: true,
      run,
      exitCode,
      written,
      findings,
      ...(preview ? { preview } : {}),
    };
  }

  onEvent(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: CommandEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
