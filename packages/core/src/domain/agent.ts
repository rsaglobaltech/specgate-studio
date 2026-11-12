import type { Finding } from "./finding.js";
import { changeOf } from "./editor.js";

/**
 * The agent panel (draft-workbench-v2 REQ-181 … REQ-183): a request to the
 * project's agent, run by specgate on a scratch copy of the project, answers
 * a plan — the files it would change, each with why and its diff, the checks
 * it runs after, what it read and the tokens it used — and nothing is written
 * until the Developer has seen the diff and confirmed it. Every value is read
 * from specgate's `agent ask|apply|discard --json` answers, never its prose;
 * the studio never writes these files itself.
 */

export type PlanChange = "modify" | "add" | "delete";

/** One file of a plan (specgate REQ-520). */
export interface AgentPlanFile {
  /** Relative to the project, with `/`. */
  path: string;
  change: PlanChange;
  /** M for a changed file, + for a new one, − for a removed one (REQ-181). */
  mark: "M" | "+" | "−";
  /** As the panel names it: `docs/specs/` left out, as the board writes it. */
  shown: string;
  /** The agent's reason; empty when it gave none. */
  why: string;
  /** The unified diff. */
  diff: string;
}

/** What an agent's plan is (REQ-181, REQ-182). */
export interface AgentPlan {
  /** Null when the agent changed nothing: an answer, not a plan to apply. */
  id: string | null;
  request: string;
  files: AgentPlanFile[];
  /** The specgate checks `agent apply` runs after writing (REQ-181: "the command it runs after"). */
  then: string[];
  /** What the agent read: the files given as context and the ones it reported (REQ-182). */
  read: string[];
  /** Tokens in and out, null when the agent did not report them; cost when it did. */
  tokens: number | null;
  cost: number | null;
  /** The open change its files are under, when they are under one (REQ-182: the diff in Changes). */
  change: string | null;
}

/** Where a request stands in the panel. */
export type AgentEntryState =
  "asking" | "plan" | "empty" | "failed" | "applying" | "applied" | "discarded";

/** One request in the panel, and what came of it. */
export interface AgentEntry {
  /** The panel's own number for it. */
  n: number;
  request: string;
  state: AgentEntryState;
  plan: AgentPlan | null;
  /** specgate's findings: `edit_refused`, `plan_empty`, `agent_not_set`, `then_failed`… */
  findings: Finding[];
  /** Once applied: the files written, and each check's exit. */
  written: string[];
  checks: Array<{ command: string; exit: number }>;
}

/** What the panel shows (REQ-181). */
export interface AgentView {
  /** The project's agent, as its program: `claude`; null when none is set. */
  agent: string | null;
  /** specgate's only mode: the specification. */
  mode: "spec";
  entries: AgentEntry[];
  /** The command that sets an agent, when none is. */
  setAgent: string;
}

/** An applied plan's diff, kept in Changes under its change (REQ-182). */
export interface AppliedPlan {
  id: string;
  request: string;
  change: string | null;
  files: AgentPlanFile[];
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** A plan's path as the panel shows it: `docs/specs/` left out (the board's `changes/draft-pedidos/…`). */
export const shownPath = (p: string) => p.replace(/^docs\/specs\//, "");

const MARK: Record<PlanChange, AgentPlanFile["mark"]> = { modify: "M", add: "+", delete: "−" };

/** The plan of `agent ask --json`, or null when specgate answered none (a refusal). */
export function agentPlanOf(data: unknown): AgentPlan | null {
  const p = (data as { plan?: unknown } | null)?.plan as Record<string, unknown> | null | undefined;
  if (!p || typeof p !== "object") return null;
  const files: AgentPlanFile[] = (Array.isArray(p.files) ? p.files : []).flatMap(
    (f: Record<string, unknown>) => {
      const path = str(f?.path).replace(/\\/g, "/");
      const change = f?.change as PlanChange;
      if (!path || !(change in MARK)) return [];
      return [
        {
          path,
          change,
          mark: MARK[change],
          shown: shownPath(path),
          why: str(f.why),
          diff: str(f.diff),
        },
      ];
    },
  );
  const usage = (p.usage ?? {}) as Record<string, unknown>;
  const input = num(usage.input);
  const output = num(usage.output);
  const change = files.map((f) => changeOf(f.path)).find((c) => c !== null) ?? null;
  return {
    id: typeof p.id === "string" && p.id ? p.id : null,
    request: str(p.request),
    files,
    then: (Array.isArray(p.then) ? p.then : []).filter((t): t is string => typeof t === "string"),
    read: (Array.isArray(p.read) ? p.read : [])
      .filter((r): r is string => typeof r === "string")
      .map((r) => r.replace(/\\/g, "/")),
    tokens: input === null && output === null ? null : (input ?? 0) + (output ?? 0),
    cost: num(usage.cost),
    change,
  };
}

/** What `agent apply --json` wrote, and each check's exit (specgate REQ-524, REQ-525). */
export function appliedOf(data: unknown): {
  written: string[];
  checks: Array<{ command: string; exit: number }>;
} | null {
  const a = (data as { applied?: unknown } | null)?.applied as Record<string, unknown> | null;
  if (!a || typeof a !== "object") return null;
  return {
    written: (Array.isArray(a.written) ? a.written : [])
      .map((w: { path?: unknown }) => str(w?.path).replace(/\\/g, "/"))
      .filter(Boolean),
    checks: (Array.isArray(a.then) ? a.then : []).map((t: Record<string, unknown>) => ({
      command: str(t?.command),
      exit: num(t?.exit) ?? 1,
    })),
  };
}

/** A plan id as specgate makes them: `20261112-085017-4bc1`; one value, never a flag. */
export const PLAN_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/;

/** A request: one line or many, never empty, never read as a flag, at most 4000 characters. */
export function validRequest(r: unknown): r is string {
  return (
    typeof r === "string" &&
    r.trim().length > 0 &&
    r.length <= 4000 &&
    !r.trimStart().startsWith("-") &&
    !r.includes("\u0000")
  );
}

/** What the panel offers when "@" is typed (REQ-183): a requirement with its title, or a file. */
export interface Mention {
  kind: "req" | "file";
  /** What goes after the "@": `REQ-031`, `docs/brief.md`. */
  value: string;
  /** A requirement's title; null for a file. */
  title: string | null;
}

/**
 * The requirements and files "@query" names (REQ-183, SCN-547): requirements
 * whose id starts with it — or whose title holds it — first, in id order,
 * then files whose path holds it; at most `limit`.
 */
export function mentions(
  query: string,
  requirements: ReadonlyArray<{ id: string; title: string | null }>,
  files: readonly string[],
  limit = 8,
): Mention[] {
  const q = query.toLowerCase();
  const reqs = requirements
    .filter((r) =>
      q === ""
        ? true
        : r.id.toLowerCase().startsWith(q) ||
          (q.length > 2 && (r.title ?? "").toLowerCase().includes(q)),
    )
    .sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }))
    .map((r): Mention => ({ kind: "req", value: r.id, title: r.title }));
  const paths = /^req-?\d*$/i.test(query)
    ? []
    : files
        .filter((f) => f.toLowerCase().includes(q))
        .sort((a, b) => a.length - b.length || a.localeCompare(b))
        .map((f): Mention => ({ kind: "file", value: f, title: null }));
  return [...reqs, ...paths].slice(0, limit);
}
