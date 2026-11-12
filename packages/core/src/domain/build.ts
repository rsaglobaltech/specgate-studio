import type { Finding } from "./finding.js";
import { SPECIFICATION_GROUP, groupOf, toPosix } from "./workspace.js";

/**
 * Build and Live (draft-build-live): what is ready to build, its estimate and
 * who codes (REQ-101), and what makes it wait (REQ-102) — every value read
 * from specgate's `--json` answers (`status`, `change show`, `harness report`,
 * `config list`, `harness run --format json`) and git's file list, never prose.
 */

/** A requirement id, as `--req` takes it. */
export const REQ_ID = /^REQ-\d+$/;

/** A requirement ready to build (A2): approved, with its scenario, no question blocking it. */
export interface BuildItem {
  id: string;
  title: string | null;
  change: string | null;
  /** specgate's own estimate for this requirement (`plan --json`'s `estimates`, REQ-493), when it gave one. */
  estimate?: ReqEstimate;
}

/** What one requirement is estimated to take, and what the estimate rests on (specgate REQ-493). */
export interface ReqEstimate {
  /** Wall-clock minutes, failed attempts included; null when nothing supports one. */
  minutes: number | null;
  /** `history`, `size`, `average` or `none`, strongest first. */
  basis: string;
  /** The runs or delivered requirements it rests on. */
  samples: number;
  /** In the unit of `cost_per_run_hint`; null when no profile declares one. */
  cost: number | null;
}

/** `plan --json`'s `estimates`, by requirement (specgate REQ-493). */
export function estimatesOf(plan: unknown): Record<string, ReqEstimate> {
  const list = (plan as { estimates?: unknown } | null)?.estimates;
  const out: Record<string, ReqEstimate> = {};
  for (const e of Array.isArray(list) ? (list as Array<Record<string, unknown>>) : []) {
    const id = str(e.requirement);
    const time = (e.time ?? {}) as Record<string, unknown>;
    if (!id) continue;
    const ms = num(time.ms);
    out[id] = {
      minutes: ms === null ? null : Math.max(1, Math.round(ms / 60_000)),
      basis: str(time.basis) ?? "none",
      samples: num(time.samples) ?? 0,
      cost: num((e.cost as { amount?: unknown } | null | undefined)?.amount),
    };
  }
  return out;
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

/**
 * The adoption baseline (draft-live-polish REQ-101, A10): delivered by
 * `specgate apply REQ-000` once the project is healthy, not code for an
 * agent — Build lists it only when the Developer names it.
 */
export const BASELINE = "REQ-000";

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
 * to build, ready or apart with why — an open question (from `status` or from
 * `questions --json`'s `blocks`), a change no person approved (`review`), or
 * no scenario yet. The
 * estimate is specgate's (A3), the agent the project's (A4).
 */
export function buildList(
  status: unknown,
  review: ReadonlySet<string>,
  report: unknown,
  config: Readonly<Record<string, string>>,
  questions: unknown = null,
  estimates: Readonly<Record<string, ReqEstimate>> = {},
  named: string | null = null,
): BuildList {
  const all = (status as { requirements?: unknown } | null)?.requirements;
  // `status --json` does not always say a question blocks a requirement:
  // `questions --json` does, by each open question's `blocks`.
  const blockedBy = new Map<string, string>();
  const open = (questions as { questions?: { open?: unknown } } | null)?.questions?.open;
  for (const q of Array.isArray(open) ? (open as Array<Record<string, unknown>>) : []) {
    const qid = str(q.id);
    // The agent's own question, asked while it builds, is answered in Live
    // (REQ-104) and the run goes on: it does not take the requirement out.
    if (!qid || !Array.isArray(q.blocks) || q.asked === "build") continue;
    for (const b of q.blocks) if (typeof b === "string" && !blockedBy.has(b)) blockedBy.set(b, qid);
  }
  const ready: BuildItem[] = [];
  const waiting: WaitingItem[] = [];
  for (const r of Array.isArray(all) ? (all as Array<Record<string, unknown>>) : []) {
    const id = str(r.id);
    const category = str(r.category);
    if (!id || !category || BUILT.has(category)) continue;
    // The adoption baseline, only once named (A10): not even among what waits.
    if (id === BASELINE && named !== BASELINE) continue;
    const item: BuildItem = {
      id,
      title: str(r.title),
      change: str(r.change),
      ...(estimates[id] ? { estimate: estimates[id] } : {}),
    };
    if (category === "WAITING_FOR_ANSWER" || blockedBy.has(id))
      waiting.push({
        ...item,
        why: "question",
        question: str(r.question) ?? blockedBy.get(id) ?? null,
      });
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

/** Uncommitted files of a folder, as Build shows them before it commits or stashes them. */
export interface FileGroup {
  group: string;
  files: string[];
}

/** The uncommitted work that makes Build wait (REQ-102), grouped by folder, the largest first. */
export interface Uncommitted {
  total: number;
  groups: FileGroup[];
}

/**
 * The uncommitted files split (A6): the specification — spec.md, docs/specs/
 * and features/ — which Build commits itself before it starts, and the rest,
 * which makes it wait, grouped by its first two folders.
 */
export function uncommittedWork(files: readonly string[]): {
  specification: string[];
  other: Uncommitted;
} {
  const specification: string[] = [];
  const groups = new Map<string, string[]>();
  for (const f of new Set(files.map(toPosix).filter(Boolean))) {
    const group = groupOf(f);
    if (group === SPECIFICATION_GROUP) specification.push(f);
    else groups.set(group, [...(groups.get(group) ?? []), f]);
  }
  const sorted = [...groups]
    .map(([group, list]) => ({ group, files: list }))
    .sort((a, b) => b.files.length - a.files.length || a.group.localeCompare(b.group));
  return {
    specification,
    other: { total: sorted.reduce((n, g) => n + g.files.length, 0), groups: sorted },
  };
}

/**
 * A build (A5): `harness run` on one requirement, streaming one JSON event a
 * line (`--format jsonl`, specgate REQ-496) whose last line holds the report;
 * with `allowDirty`, the uncommitted files left as they are (REQ-490, "Ignore").
 * Null for anything else.
 */
export function harnessArgs(req: string, allowDirty = false): string[] | null {
  return REQ_ID.test(req)
    ? [
        "harness",
        "run",
        "--req",
        req,
        ...(allowDirty ? ["--allow-dirty"] : []),
        "--format",
        "jsonl",
      ]
    : null;
}

/** The commit Build makes of the specification before it starts (A6). */
export const saveSpecification = (req: string) =>
  `chore(spec): save the specification before building ${req}`;

/** What pressing Build, or confirming a commit or a stash before it, answers. */
export type BuildStart =
  | { ok: true; req: string; queued: boolean }
  | {
      ok: false;
      code: "build_waits";
      req: string;
      /** Why: the agent works on its own branch from the last commit and would leave this out. */
      message: string;
      waits: Uncommitted;
    }
  | {
      ok: false;
      code:
        | "build_not_ready"
        | "build_no_agent"
        | "build_no_git"
        | "build_no_message"
        | "build_git_failed"
        | "write_busy";
      req: string;
      message: string;
    };

/** What to do with the uncommitted work, once the Developer confirmed it (A7). */
export type Resolution =
  { choice: "commit"; message: string } | { choice: "stash" } | { choice: "ignore" };

/** One requirement's result in `harness run --format json`. */
export interface HarnessResult {
  requirement: string;
  /** pass, fail, question, blocked, skipped — as specgate names it. */
  result: string;
  branch: string | null;
  /** specgate's own words on why it did not pass. */
  error: string | null;
  /** The question the agent asked, for `question`. */
  question: string | null;
}

/** How a build ended, from its JSON report: its results, or the findings that refused it. */
export function harnessReport(stdout: string): {
  results: HarnessResult[];
  findings: Finding[];
} | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    // `--format jsonl`: the last line, `run-end`, holds the report and the findings (REQ-497).
    const end = stdout
      .split(/\r?\n/)
      .reverse()
      .map((l) => {
        try {
          return JSON.parse(l) as { type?: unknown; report?: unknown; status?: unknown };
        } catch {
          return null;
        }
      })
      .find((e) => e?.type === "run-end");
    if (!end) return null;
    parsed = { ...((end.report as object | null) ?? {}), status: end.status };
  }
  const doc = (parsed ?? {}) as { results?: unknown; status?: unknown };
  const results = (Array.isArray(doc.results) ? doc.results : []).map(
    (r: Record<string, unknown>) => ({
      requirement: str(r.requirement) ?? "",
      result: str(r.result) ?? "fail",
      branch: str(r.branch),
      error: str(r.error),
      question: str(r.question),
    }),
  );
  const findings = Array.isArray(doc.status) ? (doc.status as Finding[]) : [];
  return { results, findings };
}

/** What pressing a Stop answers (REQ-105): the requirement it stops, and what will not start. */
export type StopResult =
  | { ok: true; req: string; now: boolean; queued: string[] }
  | { ok: false; code: "build_not_running"; message: string };
