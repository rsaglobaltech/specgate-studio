import { commandLine, shown, type SpecgateCommand } from "../domain/command.js";
import type { Finding } from "../domain/finding.js";
import type { Lang, Notice } from "../domain/help.js";
import { findingLine } from "../domain/changes.js";
import { agentProgram, SET_AGENT } from "../domain/build.js";
import {
  agentPlanOf,
  appliedOf,
  validRequest,
  type AgentEntry,
  type AgentView,
  type AppliedPlan,
} from "../domain/agent.js";
import type { SpecgateAnswer, SpecgatePort } from "../ports/SpecgatePort.js";
import type { StorePort } from "../ports/StorePort.js";
import type { Commands, Tracked } from "./Commands.js";

export interface AgentOptions {
  /** Tells each run in the terminal, with its notice, and guards writes (REQ-006). */
  commands: Pick<Commands, "track">;
  /** specgate answering `--json`: `agent ask|apply|discard` and `config list`. */
  specgate: Pick<SpecgatePort, "call">;
  /** Told whenever what the panel shows changed: every open UI sees the same. */
  onChange?: (view: AgentView) => void;
  /** Told the files an applied plan wrote: the sections they feed are read again. */
  onWritten?: (paths: string[]) => Promise<void>;
  /** Where the applied plans' diffs are kept for Changes, by project; memory when not given. */
  store?: StorePort;
  /** The project, the key its applied plans are kept under. */
  project?: string;
}

/** What pressing a button of the panel answers. */
export type AgentResult =
  | { ok: true; entry: AgentEntry }
  | {
      ok: false;
      code: "agent_busy" | "write_busy" | "request_invalid" | "no_plan";
      message: string;
      notice?: Record<Lang, Notice>;
    };

const APPLIED_KEY = "agent-applied";

/**
 * The agent panel's use cases (draft-workbench-v2 REQ-181 … REQ-183). A
 * request goes to `specgate agent ask "<request>" --plan --json`, which runs
 * the project's agent on a scratch copy and answers a plan that writes
 * nothing; `agent apply <id>` writes it — only once the Developer has seen
 * the diff and confirmed it in the UI — and `agent discard <id>` drops it.
 * Each is told in the terminal as any command the studio runs, with its
 * notice. The studio never writes these files itself: specgate does, and
 * checks them. An applied plan's diff is kept for Changes (REQ-182).
 */
export class Agent {
  private entries: AgentEntry[] = [];
  private n = 0;
  private asking = false;
  private memory: Record<string, AppliedPlan[]> = {};

  constructor(private readonly options: AgentOptions) {}

  /** What the panel shows: the agent, its mode and every request of this session. */
  async view(): Promise<AgentView> {
    const config = await this.call({ name: "config-list" }).catch(() => null);
    const command = (config?.data as { config?: { agent?: unknown } } | null)?.config?.agent;
    return {
      agent: typeof command === "string" && command.trim() ? agentProgram(command) : null,
      mode: "spec",
      entries: structuredClone(this.entries),
      setAgent: SET_AGENT,
    };
  }

  /**
   * A request (REQ-183): specgate runs the agent and answers its plan, or why
   * there is none; nothing is written to the project. One request at a time.
   */
  async ask(request: unknown): Promise<AgentResult> {
    if (!validRequest(request))
      return {
        ok: false,
        code: "request_invalid",
        message: "A request is some text, not starting with a dash.",
      };
    if (this.asking)
      return { ok: false, code: "agent_busy", message: "The agent is answering a request." };
    this.asking = true;
    const entry: AgentEntry = {
      n: ++this.n,
      request: request.trim(),
      state: "asking",
      plan: null,
      findings: [],
      written: [],
      checks: [],
    };
    this.entries.push(entry);
    await this.tell();
    try {
      const command: SpecgateCommand = { name: "agent-ask", request: entry.request };
      const args = commandLine(command)!.args;
      await this.options.commands.track(shown(args), false, async (output): Promise<Tracked> => {
        let answer: SpecgateAnswer;
        try {
          answer = await this.options.specgate.call(args);
        } catch (e) {
          entry.state = "failed";
          entry.findings = [failure(e)];
          throw e;
        }
        entry.findings = answer.findings;
        for (const f of answer.findings) output(findingLine(f));
        const plan = agentPlanOf(answer.data);
        const refused = answer.findings.some((f) => f.severity === "error");
        entry.plan = plan;
        entry.state = refused || !plan ? "failed" : plan.id && plan.files.length ? "plan" : "empty";
        for (const f of plan?.files ?? [])
          output(`  ${f.mark} ${f.shown}${f.why ? `  — ${f.why}` : ""}\n`);
        if (plan?.then.length) output(`  then: ${plan.then.join(", ")}\n`);
        return {
          exitCode: refused ? answer.exitCode || 1 : 0,
          action: "agent-ask",
          vars: { count: String(plan?.files.length ?? 0), ...(plan?.id ? { id: plan.id } : {}) },
          findings: answer.findings,
          written: [],
        };
      });
      if (entry.state === "asking") entry.state = "failed";
      return { ok: true, entry: structuredClone(entry) };
    } finally {
      this.asking = false;
      await this.tell();
    }
  }

  /**
   * Apply plan `n` (REQ-182): sent only once the Developer saw its diff and
   * confirmed. specgate writes the files byte for byte when none changed
   * since (`plan_stale` otherwise), runs its checks and commits nothing.
   */
  async apply(n: unknown): Promise<AgentResult> {
    const entry = this.entries.find((e) => e.n === n);
    if (!entry || entry.state !== "plan" || !entry.plan?.id)
      return { ok: false, code: "no_plan", message: "No plan to apply." };
    const plan = entry.plan;
    const id = plan.id!;
    const args = commandLine({ name: "agent-apply", id })!.args;
    entry.state = "applying";
    await this.tell();
    let written: string[] = [];
    const run = await this.options.commands.track(
      shown(args),
      true,
      async (output): Promise<Tracked> => {
        const answer = await this.options.specgate.call(args);
        for (const f of answer.findings) output(findingLine(f));
        const applied = appliedOf(answer.data);
        const refused = answer.findings.some((f) => f.severity === "error") || !applied;
        entry.findings = answer.findings;
        if (!refused) {
          written = applied!.written;
          entry.written = written;
          entry.checks = applied!.checks;
          for (const f of written) output(`  wrote ${f}\n`);
          for (const c of applied!.checks) output(`  ${c.exit === 0 ? "✔" : "✖"} ${c.command}\n`);
        }
        return {
          exitCode: refused ? answer.exitCode || 1 : 0,
          action: "agent-apply",
          vars: {
            id,
            ...(plan.change ? { change: plan.change } : {}),
            ...(plan.then[0] ? { then: plan.then.join(", ") } : {}),
          },
          findings: answer.findings.filter((f) => f.severity === "error"),
          written,
        };
      },
    );
    if (!run.ok) {
      entry.state = "plan";
      await this.tell();
      return { ok: false, code: "write_busy", message: run.message };
    }
    entry.state = written.length ? "applied" : "plan";
    if (written.length) {
      await this.keep({ id, request: entry.request, change: plan.change, files: plan.files });
      await this.options.onWritten?.(written);
    }
    await this.tell();
    return { ok: true, entry: structuredClone(entry) };
  }

  /** Drop plan `n` (REQ-182): nothing of the project is written. */
  async discard(n: unknown): Promise<AgentResult> {
    const entry = this.entries.find((e) => e.n === n);
    if (!entry || !["plan", "empty", "failed"].includes(entry.state))
      return { ok: false, code: "no_plan", message: "No plan to discard." };
    const id = entry.plan?.id;
    if (id && entry.state === "plan") {
      const args = commandLine({ name: "agent-discard", id })!.args;
      await this.options.commands.track(shown(args), false, async (output): Promise<Tracked> => {
        const answer = await this.options.specgate.call(args);
        for (const f of answer.findings) output(findingLine(f));
        return {
          exitCode: 0,
          action: "agent-discard",
          vars: { id },
          // A plan already gone is gone: nothing to refuse.
          findings: [],
          written: [],
        };
      });
    }
    entry.state = "discarded";
    await this.tell();
    return { ok: true, entry: structuredClone(entry) };
  }

  /** The plans applied in this project, the newest first: Changes shows their diffs (REQ-182). */
  async applied(): Promise<AppliedPlan[]> {
    return [...(await this.kept())].reverse();
  }

  private async kept(): Promise<AppliedPlan[]> {
    const key = this.options.project ?? "";
    if (!this.options.store) return this.memory[key] ?? [];
    const all = (await this.options.store.read<Record<string, AppliedPlan[]>>(APPLIED_KEY)) ?? {};
    return all[key] ?? [];
  }

  private async keep(plan: AppliedPlan): Promise<void> {
    const key = this.options.project ?? "";
    // The last 50: enough to read back, never the whole history.
    const list = [...(await this.kept()), plan].slice(-50);
    if (!this.options.store) {
      this.memory[key] = list;
      return;
    }
    const all = (await this.options.store.read<Record<string, AppliedPlan[]>>(APPLIED_KEY)) ?? {};
    await this.options.store.write(APPLIED_KEY, { ...all, [key]: list });
  }

  private async tell(): Promise<void> {
    if (!this.options.onChange) return;
    this.options.onChange(await this.view());
  }

  private call(command: SpecgateCommand): Promise<SpecgateAnswer> {
    const line = commandLine(command);
    if (!line || line.write) return Promise.reject(new Error(`${command.name} is not a read`));
    return this.options.specgate.call(line.args);
  }
}

const failure = (e: unknown): Finding => ({
  severity: "error",
  code: "agent_failed",
  message: e instanceof Error ? e.message : String(e),
});
