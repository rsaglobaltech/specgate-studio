import { commandLine, shown, type RunResult, type SpecgateCommand } from "../domain/command.js";
import type { Finding } from "../domain/finding.js";
import type { Lang, Notice } from "../domain/help.js";
import {
  BRIEF_FILE,
  agentOf,
  briefModulesOf,
  busyNotice,
  noAgentNotice,
  nothingToDraftNotice,
  posixFindings,
  type BriefView,
} from "../domain/brief.js";
import type { SpecgateAnswer, SpecgatePort } from "../ports/SpecgatePort.js";

/** What runs the brief's commands: Commands, which tells every run and guards writes. */
export interface CommandRunner {
  run(command: SpecgateCommand): Promise<RunResult>;
}

/** How "Draft the modules" ended (REQ-073). */
export type DraftResult =
  | {
      ok: true;
      /** The modules drafted, in the order they ran. */
      drafted: string[];
      /** The module whose draft did not pass: the ones after it did not run. */
      stopped?: string;
      /** Told when nothing ran; each draft's own notice ends its run. */
      notice?: Record<Lang, Notice>;
    }
  | {
      ok: false;
      code: "write_busy" | "no_agent" | "command_unknown";
      message: string;
      notice?: Record<Lang, Notice>;
    };

/**
 * The Brief view's use cases (draft-brief): the brief's checks on every save,
 * kept for Problems (REQ-072), and "Draft the modules" — each module not
 * drafted yet, with the project's agent, one at a time (REQ-073). Commands
 * run through the host's Commands, so each is echoed in the terminal, ends
 * with its notice and is one write at a time (draft-core-host REQ-006).
 */
export class Brief {
  private findings: Finding[] = [];
  private checks = 0;
  /** The draft running now, as the person would type it; null when none runs. */
  private drafting: string | null = null;

  constructor(
    private readonly commands: CommandRunner,
    private readonly specgate: Pick<SpecgatePort, "call">,
  ) {}

  /**
   * A file was saved, from the form or as markdown: when it is the brief, its
   * checks run and their findings are what Problems lists (REQ-072). Null for
   * any other file. A check that answers after a newer one is dropped.
   */
  async saved(path: string): Promise<Finding[] | null> {
    if (path !== BRIEF_FILE) return null;
    const mine = ++this.checks;
    const result = await this.commands.run({ name: "brief-check" });
    const findings = result.ok ? posixFindings(result.findings ?? []) : this.findings;
    if (mine === this.checks) this.findings = findings;
    return this.findings;
  }

  /** What the brief's last check found, for Problems and the editor's underlines. */
  problems(): Finding[] {
    return this.findings;
  }

  /** The brief's modules, where each stands, and the agent that drafts them. */
  async view(): Promise<BriefView> {
    const [modules, config] = await Promise.all([
      this.read({ name: "brief-modules" }),
      this.read({ name: "config-list" }),
    ]);
    return { modules: briefModulesOf(modules.data), agent: agentOf(config.data) };
  }

  /**
   * "Draft the modules" (REQ-073): with no agent set, nothing runs and the
   * notice names the command that sets one (SCN-217). Otherwise each module
   * not drafted yet, in the brief's order, `propose --from-brief <module>
   * --agent <agent>`, the next only once the previous has ended (SCN-215); one
   * that does not pass stops the rest. Pressed again meanwhile, it is refused
   * with `write_busy`, naming the draft that runs (SCN-216).
   */
  async draft(): Promise<DraftResult> {
    if (this.drafting) return this.busy(this.drafting);
    this.drafting = "specgate propose --from-brief";
    try {
      const agent = agentOf((await this.read({ name: "config-list" })).data);
      if (!agent) {
        return {
          ok: false,
          code: "no_agent",
          message: "No agent is set for the project.",
          notice: noAgentNotice(),
        };
      }
      const modules = briefModulesOf((await this.read({ name: "brief-modules" })).data);
      const todo = modules.filter((m) => !m.drafted).map((m) => m.module);
      if (todo.length === 0) return { ok: true, drafted: [], notice: nothingToDraftNotice() };
      const drafted: string[] = [];
      for (const module of todo) {
        const command: SpecgateCommand = { name: "draft-module", module, agent };
        const line = commandLine(command);
        if (!line) {
          return {
            ok: false,
            code: "command_unknown",
            message: `${module} is not a module the studio may draft.`,
          };
        }
        this.drafting = shown(line.args);
        const result = await this.commands.run(command);
        // Another write runs (an Apply, an Archive): refused, as any write (A7).
        if (!result.ok)
          return result.code === "write_busy"
            ? { ...result, notice: busyNotice(this.drafting, result.message) }
            : result;
        const refused = (result.findings ?? []).some((f) => f.severity === "error");
        if (result.exitCode !== 0 || refused) return { ok: true, drafted, stopped: module };
        drafted.push(module);
      }
      return { ok: true, drafted };
    } finally {
      this.drafting = null;
    }
  }

  private busy(running: string): DraftResult {
    const message = `${running} is running: wait for it to end.`;
    return { ok: false, code: "write_busy", message, notice: busyNotice(running, message) };
  }

  /** A read on the allow-list: a command that writes, or is not offered, is never run here. */
  private read(command: SpecgateCommand): Promise<SpecgateAnswer> {
    const line = commandLine(command);
    if (!line || line.write) {
      return Promise.reject(new Error(`${command.name} is not a read the studio may run`));
    }
    return this.specgate.call(line.args);
  }
}
