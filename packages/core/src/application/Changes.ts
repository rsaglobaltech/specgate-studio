import { commandLine, type RunResult, type SpecgateCommand } from "../domain/command.js";
import { agentOf, SET_AGENT } from "../domain/brief.js";
import type { Finding } from "../domain/finding.js";
import type { Lang, Notice } from "../domain/help.js";
import {
  deltaFilesOf,
  groupChanges,
  changeIds,
  ticketReview,
  reviewOf,
  type ChangesView,
  type TicketReview,
} from "../domain/changes.js";
import type { Section, SectionData } from "../domain/section.js";
import type { SpecgateAnswer, SpecgatePort } from "../ports/SpecgatePort.js";

/** The sections already read and kept by ProjectState (REQ-002). */
export interface SectionSource {
  section(section: Section): Promise<SectionData>;
}

/**
 * The Changes view's reads (draft-changes): every open change in its group
 * (REQ-081), a ticket's review before its change opens (REQ-084) and the
 * file Apply wrote (REQ-086). `change list` and `status` come from the cached
 * sections; each change and the ticket from specgate's `--json`, through
 * commands on the allow-list that write nothing.
 */
/** How "Draft again with N requested changes" ended (REQ-083). */
export type RedraftResult =
  | { ok: true; module: string; open: number; exitCode: number; findings: Finding[] }
  | {
      ok: false;
      code: "no_open_request" | "no_agent" | "write_busy" | "command_unknown";
      message: string;
      notice?: Record<Lang, Notice>;
    };

const NO_AGENT: Record<Lang, Notice> = {
  en: {
    tone: "refused",
    ran: '"Draft again" ran nothing: no agent is set for the project.',
    wrote: "Nothing was written.",
    next: SET_AGENT,
    fix: `\`${SET_AGENT}\` sets Claude Code as the agent; then press "Draft again" once more.`,
  },
  es: {
    tone: "refused",
    ran: "«Redactar de nuevo» no ejecutó nada: el proyecto no tiene un agente configurado.",
    wrote: "No se escribió nada.",
    next: SET_AGENT,
    fix: `\`${SET_AGENT}\` configura Claude Code como agente; después pulsa otra vez «Redactar de nuevo».`,
  },
};

export class Changes {
  constructor(
    private readonly specgate: Pick<SpecgatePort, "call">,
    private readonly sections: SectionSource,
    /** Runs a command told in the terminal with its notice: the redraft (REQ-083). */
    private readonly commands?: { run(command: SpecgateCommand): Promise<RunResult> },
  ) {}

  /**
   * "Draft again with N requested changes" (REQ-083): the draft's module
   * drafted again by the project's agent — `propose --from-brief <module>
   * --agent <agent>`, which hands the agent the open requests of review.md and
   * none that is addressed (specgate REQ-485). Nothing runs for a draft with
   * no open request, or with no agent set.
   */
  async redraft(change: string): Promise<RedraftResult> {
    const shown = await this.read({ name: "change-show", change }).catch(() => null);
    const review = reviewOf(shown?.data);
    const module = /^draft-[a-z0-9][a-z0-9-]*$/.test(change) ? change.slice("draft-".length) : null;
    if (!module || !review || review.open === 0)
      return {
        ok: false,
        code: "no_open_request",
        message: `${change} has no open request for change: nothing to draft again.`,
      };
    const agent = agentOf((await this.read({ name: "config-list" }).catch(() => null))?.data);
    if (!agent)
      return {
        ok: false,
        code: "no_agent",
        message: "No agent is set for the project.",
        notice: NO_AGENT,
      };
    if (!this.commands) throw new Error("Changes is not wired to run commands in this host.");
    const r = await this.commands.run({ name: "redraft", module, agent, open: review.open });
    if (!r.ok) return { ok: false, code: r.code, message: r.message };
    return {
      ok: true,
      module,
      open: review.open,
      exitCode: r.exitCode,
      findings: r.findings ?? [],
    };
  }

  async view(): Promise<ChangesView> {
    const [list, status] = await Promise.all([
      this.sections.section("changes"),
      this.sections.section("home"),
    ]);
    const shows: Record<string, unknown> = {};
    await Promise.all(
      changeIds(list).map(async (change) => {
        shows[change] = await this.read({ name: "change-show", change })
          .then((a) => a.data)
          .catch(() => null);
      }),
    );
    return groupChanges(list, status, shows);
  }

  /** The ticket's review, and what its confirmation runs on `branch` (REQ-084). */
  async ticket(key: string, branch: string | null): Promise<TicketReview> {
    return ticketReview(key, await this.read({ name: "propose-ticket-check", key }), branch);
  }

  /** The files a command wrote that its answer does not list: Apply's delta (REQ-086). */
  async written(command: SpecgateCommand): Promise<string[]> {
    if (command.name !== "apply") return [];
    const status = (await this.sections.section("home")) as {
      requirements?: Array<{ id?: unknown; change?: unknown }>;
    } | null;
    const change = status?.requirements?.find((r) => r.id === command.req)?.change;
    if (typeof change !== "string") return [];
    const shown = await this.read({ name: "change-show", change }).catch(() => null);
    return shown ? deltaFilesOf(shown.data, command.req) : [];
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
