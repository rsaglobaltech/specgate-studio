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
import type { ScratchPort } from "../ports/ScratchPort.js";
import type { Commands, Tracked } from "./Commands.js";
import { findingLine } from "../domain/changes.js";
import {
  acceptProposal,
  briefFormInput,
  briefFormOf,
  formFromWire,
  type BriefForm,
} from "../domain/briefForm.js";

/** What runs the brief's commands: Commands, which tells every run and guards writes. */
export interface CommandRunner {
  run(command: SpecgateCommand): Promise<RunResult>;
}

/** The brief as a form, and what specgate's checks found in it (REQ-071). */
export interface BriefFormView {
  form: BriefForm | null;
  findings: Finding[];
  /** The proposal the client's text made, waiting for Accept or Discard (REQ-074); null when none. */
  proposal: BriefForm | null;
}

/** How saving the form, proposing one from the client's text, accepting or discarding it ended. */
export type BriefFormResult =
  | { ok: true; view: BriefFormView; written: string[] }
  | {
      ok: false;
      code: "form_invalid" | "no_agent" | "no_proposal" | "write_busy" | "failed";
      message: string;
      notice?: Record<Lang, Notice>;
    };

const DISCARDED: Record<Lang, Notice> = {
  en: {
    tone: "ok",
    ran: "The proposal was discarded: no command ran.",
    wrote: "Nothing was written: docs/brief.md is as it was.",
    next: "specgate propose --from-brief --form",
  },
  es: {
    tone: "ok",
    ran: "Se descartó la propuesta: no se ejecutó ningún comando.",
    wrote: "No se escribió nada: docs/brief.md está como estaba.",
    next: "specgate propose --from-brief --form",
  },
};

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
  /** What the client's text proposed, until it is accepted or discarded (REQ-074). */
  private proposal: BriefForm | null = null;

  constructor(
    private readonly commands: CommandRunner & Partial<Pick<Commands, "track">>,
    private readonly specgate: Pick<SpecgatePort, "call">,
    /** Files outside the project for what specgate reads from a file (REQ-071, REQ-074). */
    private readonly scratch?: ScratchPort,
  ) {}

  /** The brief as a form, read by specgate; and the proposal waiting, if any (REQ-071, REQ-074). */
  async form(): Promise<BriefFormView> {
    const answer = await this.read({ name: "brief-form" }).catch(() => null);
    return {
      form: answer ? briefFormOf(answer.data) : null,
      findings: posixFindings(answer?.findings ?? []),
      proposal: this.proposal,
    };
  }

  /**
   * Save the form (REQ-071): `propose --from-brief --form <file>`, the file
   * outside the project; specgate rewrites only the fields that changed and
   * keeps every other line of docs/brief.md byte for byte.
   */
  async saveForm(raw: unknown): Promise<BriefFormResult> {
    const form = formFromWire(raw);
    if (!form) return { ok: false, code: "form_invalid", message: "Not a brief's form." };
    return this.write(form);
  }

  /**
   * The client's text (REQ-074): the project's agent proposes the form from
   * it — `propose --from-brief --brief <file> --agent <agent>` on a file
   * outside the project — and nothing of the project is written.
   */
  async propose(text: unknown): Promise<BriefFormResult> {
    if (typeof text !== "string" || !text.trim())
      return { ok: false, code: "form_invalid", message: "Paste the client's text first." };
    const agent = agentOf((await this.read({ name: "config-list" }).catch(() => null))?.data);
    if (!agent)
      return {
        ok: false,
        code: "no_agent",
        message: "No agent is set for the project.",
        notice: noAgentNotice(),
      };
    const { scratch, track } = this.wiredForm();
    const file = await scratch.write("client-brief.md", text);
    try {
      const command: SpecgateCommand = { name: "brief-propose", file, agent };
      const args = commandLine(command)!.args;
      let proposed: BriefForm | null = null;
      const run = await track(shown(args), false, async (output): Promise<Tracked> => {
        const answer = await this.specgate.call(args);
        for (const f of answer.findings) output(findingLine(f));
        proposed = briefFormOf(answer.data);
        const refused = !proposed || answer.findings.some((f) => f.severity === "error");
        return {
          exitCode: refused ? answer.exitCode || 1 : 0,
          action: "brief-propose",
          vars: { agent },
          findings: answer.findings.filter((f) => f.severity === "error"),
          written: [],
        };
      });
      if (!run.ok) return { ok: false, code: "write_busy", message: run.message };
      if (!proposed)
        return {
          ok: false,
          code: "failed",
          message: "The agent proposed no form: see the terminal.",
        };
      this.proposal = proposed;
      return { ok: true, view: await this.form(), written: [] };
    } finally {
      await scratch.remove(file).catch(() => undefined);
    }
  }

  /** Accept the proposal (REQ-074): written into docs/brief.md, as a save of the form is. */
  async accept(): Promise<BriefFormResult> {
    if (!this.proposal)
      return { ok: false, code: "no_proposal", message: "No proposal to accept." };
    const current = (await this.form()).form;
    const r = await this.write(acceptProposal(current, this.proposal));
    if (r.ok) {
      this.proposal = null;
      r.view.proposal = null;
    }
    return r;
  }

  /** Discard the proposal (REQ-074): nothing runs, nothing is written. */
  async discard(): Promise<BriefFormResult & { notice?: Record<Lang, Notice> }> {
    this.proposal = null;
    return { ok: true, view: await this.form(), written: [], notice: DISCARDED };
  }

  private async write(form: BriefForm): Promise<BriefFormResult> {
    const { scratch, track } = this.wiredForm();
    const file = await scratch.write("brief-form.json", JSON.stringify(briefFormInput(form)));
    try {
      const args = commandLine({ name: "brief-form-write", file })!.args;
      let written: string[] = [];
      let findings: Finding[] = [];
      const run = await track(shown(args), true, async (output): Promise<Tracked> => {
        const answer = await this.specgate.call(args);
        findings = posixFindings(answer.findings);
        for (const f of findings) output(findingLine(f));
        // The brief's own findings (B1–B13) are Problems, not a refusal: only no form back is one.
        const back = (answer.data as { form?: { written?: unknown } } | null)?.form;
        written = back && back.written === true ? [BRIEF_FILE] : [];
        for (const f of written) output(`  wrote ${f}\n`);
        return {
          exitCode: back ? 0 : answer.exitCode || 1,
          action: "brief-form",
          vars: {},
          findings: back ? [] : answer.findings.filter((f) => f.severity === "error"),
          written,
        };
      });
      if (!run.ok) return { ok: false, code: "write_busy", message: run.message };
      if (run.exitCode !== 0)
        return {
          ok: false,
          code: "failed",
          message: "specgate did not write the form: see the terminal.",
        };
      // What specgate's checks found is what Problems lists (REQ-072).
      this.findings = findings;
      return { ok: true, view: await this.form(), written };
    } finally {
      await scratch.remove(file).catch(() => undefined);
    }
  }

  private wiredForm() {
    const track = this.commands.track?.bind(this.commands);
    if (!this.scratch || !track) throw new Error("The brief's form is not wired in this host.");
    return { scratch: this.scratch, track };
  }

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
