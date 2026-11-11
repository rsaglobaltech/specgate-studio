/**
 * Build and Live (draft-build-live): what is ready to build, its estimate and
 * who codes (REQ-101) — every value read from specgate's `--json` answers
 * (`status`, `change show`, `harness report`, `config list`), never its prose.
 */

/** A requirement id, as `--req` takes it. */
export const REQ_ID = /^REQ-\d+$/;

/** A requirement ready to build (A2): approved, with its scenario, no question blocking it. */
export interface BuildItem {
  id: string;
  title: string | null;
  change: string | null;
}

/** Why a requirement is not ready: an open question, a draft not approved, no scenario. */
export type WaitReason = "question" | "review" | "scenario";

export interface WaitingItem extends BuildItem {
  why: WaitReason;
  /** The question that blocks it, for `question`. */
  question: string | null;
}

/** specgate's own estimate of one requirement (A3), from `harness report --json`. */
export interface Estimate {
  /** Wall-clock minutes a delivered requirement took, failed attempts included. */
  minutes: number | null;
  /** What a delivered requirement cost, when the profiles declare it. */
  cost: number | null;
  /** The runs it is measured on. */
  runs: number;
}

export interface BuildList {
  ready: BuildItem[];
  waiting: WaitingItem[];
  /** One requirement's estimate; null when specgate could not give one. */
  estimate: Estimate | null;
  /** Who codes: the program of `agent` in harness.config.yaml (A4), e.g. `claude`. */
  agent: string | null;
  /** The agent's whole command, as the project sets it. */
  agentCommand: string | null;
  /** The command that sets one (A4). */
  setAgent: string;
}

/** The command Build names when no agent is set (A4). */
export const SET_AGENT = "specgate agents init --tool claude";

/** What is built already: delivered, or only its status left to update. */
const BUILT = new Set(["DONE", "NEEDS_STATUS_UPDATE"]);

const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** specgate's estimate (A3): `harness report --json`'s time and declared cost per delivered requirement. */
export function estimateOf(report: unknown): Estimate | null {
  const r = (report as { report?: Record<string, unknown> } | null)?.report;
  if (!r || typeof r !== "object") return null;
  const ms = num(r.msPerDelivered);
  const passed = num(r.passed) ?? 0;
  const total = num((r.estimatedCost as { total?: unknown } | null | undefined)?.total);
  return {
    minutes: ms === null ? null : Math.max(1, Math.round(ms / 60_000)),
    cost: total !== null && passed > 0 ? Math.round((total / passed) * 100) / 100 : null,
    runs: num(r.runs) ?? 0,
  };
}

/** The program an agent's command runs: `claude` for `claude -p < {prompt_file}`. */
export function agentProgram(command: string): string | null {
  const first = command.trim().split(/\s+/)[0] ?? "";
  const program = first.replace(/^.*[\\/]/, "").replace(/\.(cmd|exe|bat|ps1)$/i, "");
  return program || null;
}

/**
 * What Build lists (REQ-101, A2): every requirement `status --json` has left
 * to build, ready or apart with why — an open question, a draft no person
 * approved (`review`, the changes of that group), or no scenario yet. The
 * estimate is specgate's (A3), the agent the project's (A4).
 */
export function buildList(
  status: unknown,
  review: ReadonlySet<string>,
  report: unknown,
  config: Readonly<Record<string, string>>,
): BuildList {
  const all = (status as { requirements?: unknown } | null)?.requirements;
  const ready: BuildItem[] = [];
  const waiting: WaitingItem[] = [];
  for (const r of Array.isArray(all) ? (all as Array<Record<string, unknown>>) : []) {
    const id = str(r.id);
    const category = str(r.category);
    if (!id || !category || BUILT.has(category)) continue;
    const item: BuildItem = { id, title: str(r.title), change: str(r.change) };
    if (category === "WAITING_FOR_ANSWER")
      waiting.push({ ...item, why: "question", question: str(r.question) });
    else if (item.change && review.has(item.change))
      waiting.push({ ...item, why: "review", question: null });
    else if (category === "NEEDS_FEATURE")
      waiting.push({ ...item, why: "scenario", question: null });
    else ready.push(item);
  }
  const agentCommand = str(config.agent);
  return {
    ready,
    waiting,
    estimate: estimateOf(report),
    agent: agentCommand ? agentProgram(agentCommand) : null,
    agentCommand,
    setAgent: SET_AGENT,
  };
}
