import type { Section, SectionData } from "../domain/section.js";
import type { ActionId, HelpVars, Lang, Notice } from "../domain/help.js";
import { LANGS, proposalNotice } from "../domain/help.js";
import type { Finding } from "../domain/finding.js";
import {
  addedText,
  agentTestRequest,
  lineDiff,
  scenarioIn,
  testPathFor,
  testSkeleton,
  testStyleOf,
  traceViewOf,
  type TestProposal,
  type TraceRow,
  type TraceView,
} from "../domain/traceability.js";
import type { AgentEntry } from "../domain/agent.js";
import type { AgentResult } from "./Agent.js";

/** The project's files Traceability reads and, once confirmed, writes one of. */
export interface TraceFiles {
  list(): Promise<string[]>;
  read(path: string): Promise<string>;
  /** A new file: refuses one that exists, so a test is never overwritten. */
  create?(path: string, dir: boolean): Promise<void>;
  write?(path: string, text: string): Promise<void>;
}

/** The agent panel's use case, as "Ask the agent" uses it (draft-workbench-v2 REQ-181 … REQ-183). */
export interface TraceAgent {
  ask(request: unknown): Promise<AgentResult>;
  apply(n: unknown, as?: { action: ActionId; vars: HelpVars }): Promise<AgentResult>;
  discard(n: unknown): Promise<AgentResult>;
}

export interface TraceabilityOptions {
  /** The core host's state: `matrix` and `home` from memory; a written test refreshes the matrix. */
  sections: {
    section(s: Section): Promise<SectionData>;
    fileChanged(path: string): Promise<unknown>;
  };
  files: TraceFiles;
  /** The project's agent through specgate's `agent ask|apply|discard`; none: "Ask the agent" refuses. */
  agent?: TraceAgent;
}

/** Why "Fix", a confirmation or "Ask the agent" did nothing. */
export type TraceRefusal =
  "no_row" | "has_test" | "no_feature" | "no_scenario" | "exists" | "no_agent" | "no_plan";

export type FixResult =
  { ok: true; proposal: TestProposal } | { ok: false; code: TraceRefusal; message: string };

/** How a confirmation or a cancel ended: its notice in both languages (REQ-123). */
export interface TraceWriteResult {
  ok: boolean;
  /** The file written; null when nothing was. */
  written: string | null;
  notice: Record<Lang, Notice>;
}

/** What "Ask the agent" answered (REQ-123, A11): its test against the skeleton, with its cost. */
export type TraceAgentResult =
  | {
      ok: true;
      proposal: TestProposal;
      /** The agent panel's entry: its plan, findings and number for apply or discard. */
      entry: AgentEntry;
      /** The agent's test, whole; null when its plan has no such file. */
      text: string | null;
      /** The agent's test against the skeleton, a unified diff; null with no text. */
      diff: string | null;
      tokens: number | null;
      cost: number | null;
      /** specgate's findings: `edit_refused` when the test was left out of the plan. */
      findings: Finding[];
    }
  | { ok: false; code: TraceRefusal | string; message: string };

const both = (f: (lang: Lang) => Notice): Record<Lang, Notice> =>
  Object.fromEntries(LANGS.map((l) => [l, f(l)])) as Record<Lang, Notice>;

/**
 * Traceability's use cases (draft-traceability REQ-121 … REQ-123): the rows
 * read from specgate's per-scenario matrix, kept in the core host's memory;
 * "Fix" proposes the missing test as a skeleton written from the scenario —
 * no agent, no cost — and writes it only when the Developer confirms, never
 * over a file that exists; "Ask the agent" has specgate run the project's
 * agent on the skeleton and answers its test as a diff with its cost, written
 * by `specgate agent apply` once confirmed. Nothing is written before.
 */
export class Traceability {
  constructor(private readonly options: TraceabilityOptions) {}

  /** One row per scenario, the filters' counts (REQ-121, REQ-122). */
  async view(): Promise<TraceView> {
    const [matrix, home] = await Promise.all([
      this.options.sections.section("matrix"),
      this.options.sections.section("home").catch(() => null),
    ]);
    return traceViewOf(matrix, home);
  }

  /** "Fix" on a row without a test (REQ-123): the proposal, nothing written. */
  async fix(requirement: unknown, scenario: unknown): Promise<FixResult> {
    const view = await this.view();
    const row = view.rows.find((r) => r.requirement === requirement && r.scenario === scenario);
    if (!row || !row.scenario)
      return { ok: false, code: "no_row", message: `No row for ${String(scenario)}.` };
    if (!row.gaps.includes("test"))
      return { ok: false, code: "has_test", message: `A test already names ${row.scenario}.` };
    if (!row.feature)
      return {
        ok: false,
        code: "no_feature",
        message: `${row.scenario} has no feature file: its steps cannot be read.`,
      };
    const text = await this.options.files.read(row.feature);
    const found = scenarioIn(text, row.scenario);
    if (!found)
      return {
        ok: false,
        code: "no_scenario",
        message: `${row.feature} has no scenario ${row.scenario}.`,
      };
    const tests = [...new Set(view.rows.flatMap((r) => r.tests))];
    const files = new Set(await this.options.files.list().catch(() => [] as string[]));
    const path = testPathFor(row, tests, (p) => files.has(p));
    const sample = await this.sample(row, tests);
    return {
      ok: true,
      proposal: {
        requirement: row.requirement,
        scenario: row.scenario,
        title: found.title,
        feature: row.feature,
        line: found.line,
        path,
        text: testSkeleton({
          requirement: row.requirement,
          scenario: found,
          feature: row.feature,
          style: testStyleOf(sample?.path ?? path, sample?.text ?? ""),
        }),
        steps: found.steps,
      },
    };
  }

  /**
   * The proposal confirmed (REQ-123): the skeleton proposed now is written —
   * never a text the wire sends — to a file that does not exist yet; the
   * matrix is read again. It never commits, runs the tests or marks the
   * requirement (A7).
   */
  async confirm(requirement: unknown, scenario: unknown): Promise<TraceWriteResult> {
    const fixed = await this.fix(requirement, scenario);
    const vars = { req: String(requirement), scenario: String(scenario) };
    if (!fixed.ok) return this.refused(vars, fixed.message);
    const p = fixed.proposal;
    const files = this.options.files;
    if (!files.write) return this.refused(vars, "The project's files cannot be written here.");
    try {
      if (files.create) await files.create(p.path, false);
      else if ((await files.list()).includes(p.path))
        throw new Error(`${p.path} already exists: nothing was written`);
      await files.write(p.path, p.text);
    } catch (e) {
      return this.refused({ ...vars, path: p.path }, e instanceof Error ? e.message : String(e));
    }
    await this.options.sections.fileChanged(p.path).catch(() => undefined);
    return {
      ok: true,
      written: p.path,
      notice: both((l) =>
        proposalNotice("trace-fix", l, { ...vars, path: p.path }, { written: p.path }),
      ),
    };
  }

  /** The proposal cancelled (REQ-123): nothing is written, the row is still a gap. */
  async cancel(requirement: unknown, scenario: unknown, plan?: unknown): Promise<TraceWriteResult> {
    const vars = { req: String(requirement), scenario: String(scenario) };
    if (plan !== undefined && this.options.agent) await this.options.agent.discard(plan);
    return {
      ok: true,
      written: null,
      notice: both((l) =>
        proposalNotice(plan !== undefined ? "trace-ask-agent" : "trace-fix", l, vars, {
          cancelled: true,
        }),
      ),
    };
  }

  /**
   * "Ask the agent" (REQ-123, A11): specgate runs the project's agent on the
   * skeleton and the scenario and answers a plan; its test is shown against
   * the skeleton with the tokens and cost of that run. Nothing is written.
   */
  async ask(requirement: unknown, scenario: unknown): Promise<TraceAgentResult> {
    if (!this.options.agent)
      return { ok: false, code: "no_agent", message: "The agent is not wired in this host." };
    const fixed = await this.fix(requirement, scenario);
    if (!fixed.ok) return fixed;
    const p = fixed.proposal;
    const asked = await this.options.agent.ask(agentTestRequest(p));
    if (!asked.ok) return asked;
    const entry = asked.entry;
    const file = entry.plan?.files.find((f) => f.path === p.path);
    const text = file ? addedText(file.diff) : null;
    return {
      ok: true,
      proposal: p,
      entry,
      text,
      diff: text === null ? null : lineDiff(p.text, text),
      tokens: entry.plan?.tokens ?? null,
      cost: entry.plan?.cost ?? null,
      findings: entry.findings,
    };
  }

  /** The agent's test confirmed (REQ-123): `specgate agent apply` writes it; then the matrix. */
  async confirmAgent(
    n: unknown,
    requirement: unknown,
    scenario: unknown,
    path: unknown,
  ): Promise<TraceWriteResult> {
    const vars = {
      req: String(requirement),
      scenario: String(scenario),
      path: String(path),
    };
    if (!this.options.agent)
      return this.refused(vars, "The agent is not wired in this host.", "trace-ask-agent");
    const applied = await this.options.agent.apply(n, { action: "trace-ask-agent", vars });
    if (!applied.ok) return this.refused(vars, applied.message, "trace-ask-agent");
    const written = applied.entry.written;
    if (!written.length) {
      const why = applied.entry.findings.find((f) => f.severity === "error");
      return this.refused(
        vars,
        why ? `${why.code}: ${why.message}` : "specgate wrote nothing.",
        "trace-ask-agent",
      );
    }
    const file = written.find((w) => w === path) ?? written[0]!;
    return {
      ok: true,
      written: file,
      notice: both((l) => proposalNotice("trace-ask-agent", l, vars, { written: file })),
    };
  }

  private refused(
    vars: HelpVars,
    why: string,
    action: "trace-fix" | "trace-ask-agent" = "trace-fix",
  ): TraceWriteResult {
    return {
      ok: false,
      written: null,
      notice: both((l) => proposalNotice(action, l, vars, { refused: why })),
    };
  }

  /** A test of the project to read its style from: one of the module's first (A6). */
  private async sample(
    row: TraceRow,
    tests: readonly string[],
  ): Promise<{ path: string; text: string } | null> {
    const module = row.feature?.split("/").slice(1, -1).join("/") ?? "";
    const ordered = [
      ...tests.filter((t) => module && t.includes(`/${module}/`)),
      ...tests.filter((t) => !(module && t.includes(`/${module}/`))),
    ];
    for (const t of ordered.slice(0, 5)) {
      const text = await this.options.files.read(t).catch(() => null);
      if (text !== null) return { path: t, text };
    }
    return null;
  }
}
