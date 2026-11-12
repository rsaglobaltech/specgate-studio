/**
 * Home as the boards draw it (draft-design-conformance REQ-173, A8, A9): the
 * next step as a sentence with its reason and its button, the route a
 * project takes, and what happened lately. Plain data the UI words in each
 * language; worked out from what specgate answered.
 */

/** The next step: what to do, and what for (A8). */
export type NextStep =
  | {
      kind: "answer";
      /** How many questions are open. */
      count: number;
      /** The change most of them belong to, and its module. */
      change: string;
      module: string;
      /** What they block. */
      reqs: string[];
      command: string;
    }
  | { kind: "review"; change: string; module: string }
  | { kind: "apply"; req: string; command: string }
  | { kind: "build"; req: string; command: string }
  | { kind: "archive"; change: string; command: string }
  | { kind: "command"; command: string }
  | { kind: "done" };

interface OpenQuestionLike {
  id?: unknown;
  change?: unknown;
  blocks?: unknown;
  asked?: unknown;
}

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

/**
 * The next step (A8): the one `specgate status` names, as a sentence with its
 * reason. Answering is said with the questions still open and what they
 * block; a draft no person approved, with its change.
 */
export function nextStep(status: unknown, questions: unknown, review: readonly string[]): NextStep {
  const command = str((status as { nextCommand?: unknown } | null)?.nextCommand);
  const open = (
    ((questions as { questions?: { open?: unknown } } | null)?.questions?.open ?? []) as unknown[]
  ).filter((q): q is OpenQuestionLike => !!q && typeof q === "object");
  if (command && /\banswer\b/.test(command) && open.length > 0) {
    const byChange = new Map<string, number>();
    for (const q of open) {
      const c = str(q.change) ?? "project";
      byChange.set(c, (byChange.get(c) ?? 0) + 1);
    }
    const change = [...byChange].sort((a, b) => b[1] - a[1])[0]![0];
    const reqs = [
      ...new Set(open.flatMap((q) => (Array.isArray(q.blocks) ? q.blocks.filter(str) : []))),
    ] as string[];
    return {
      kind: "answer",
      count: open.length,
      change,
      module: change.replace(/^draft-/, ""),
      reqs: reqs.sort(),
      command,
    };
  }
  if (!command) {
    if (review.length > 0) {
      const change = review[0]!;
      return { kind: "review", change, module: change.replace(/^draft-/, "") };
    }
    return { kind: "done" };
  }
  const approve = /\bchange\s+approve\s+(\S+)/.exec(command)?.[1];
  if (approve) return { kind: "review", change: approve, module: approve.replace(/^draft-/, "") };
  const req = /\bREQ-\d+\b/.exec(command)?.[0];
  if (req && /\bapply\b/.test(command)) return { kind: "apply", req, command };
  if (req && /\bharness\b|\bbuild\b/.test(command)) return { kind: "build", req, command };
  const archive = /\barchive\s+(\S+)/.exec(command)?.[1];
  if (archive) return { kind: "archive", change: archive, command };
  return { kind: "command", command };
}

/** The route's seven steps, in order (A9). */
export const ROUTE = [
  "created",
  "brief",
  "drafted",
  "answered",
  "approved",
  "built",
  "report",
] as const;
export type RouteStep = (typeof ROUTE)[number];

export interface RouteState {
  step: RouteStep;
  state: "done" | "current" | "todo";
  /** What the step counts: the brief's modules, the questions still open. */
  count?: number;
}

/**
 * Where the project is on the route (A9): each step done, the first one not
 * done current, the rest to do. The report is done only by sending it, so it
 * is at most current.
 */
export function routeOf(input: {
  brief: boolean;
  modules: number;
  /** Modules of the brief not drafted yet. */
  undrafted: number;
  openQuestions: number;
  toReview: number;
  pending: number;
}): RouteState[] {
  const done: Record<RouteStep, boolean> = {
    created: true,
    brief: input.brief,
    drafted: input.brief && input.undrafted === 0,
    answered: input.openQuestions === 0,
    approved: input.toReview === 0,
    built: input.pending === 0,
    report: false,
  };
  let current = false;
  return ROUTE.map((step) => {
    const count =
      step === "brief" ? input.modules : step === "answered" ? input.openQuestions : undefined;
    let state: RouteState["state"] = "todo";
    if (done[step] && !current) state = "done";
    else if (!current) {
      state = "current";
      current = true;
    }
    return count === undefined ? { step, state } : { step, state, count };
  });
}

/** What happened lately, as the boards list it (A9). */
export interface Activity {
  kind: "apply" | "build" | "draft" | "ticket";
  text: string;
  /** Epoch seconds. */
  at: number;
}

/** Recent commits read as activity: what was applied, built, drafted, and tickets (A9). */
export function activityOf(
  commits: ReadonlyArray<{ at: number; subject: string }>,
  limit = 4,
): Activity[] {
  const out: Activity[] = [];
  for (const c of commits) {
    const s = c.subject.trim();
    const kind: Activity["kind"] | null = /^REQ-\d+.*\b(appl(y|ied)|deliver)/i.test(s)
      ? "apply"
      : /\b(harness|build|built)\b/i.test(s)
        ? "build"
        : /\b(draft|propose|proposed)\b/i.test(s)
          ? "draft"
          : /^[A-Z][A-Z0-9]+-\d+\b/.test(s)
            ? "ticket"
            : /^REQ-\d+/.test(s)
              ? "apply"
              : null;
    if (!kind) continue;
    out.push({ kind, text: s.length > 90 ? `${s.slice(0, 89)}…` : s, at: c.at });
    if (out.length >= limit) break;
  }
  return out;
}

/** What the agent cost, from `harness report --json` (A9). */
export function agentCostOf(
  report: unknown,
): { total: number; minutes: number; runs: number } | null {
  const r = (report as { report?: Record<string, unknown> } | null)?.report;
  if (!r || typeof r !== "object") return null;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const total = num((r.estimatedCost as { total?: unknown } | null | undefined)?.total);
  const minutes = Math.round((num(r.msPerDelivered) * num(r.passed)) / 60_000);
  return { total: Math.round(total * 100) / 100, minutes, runs: num(r.runs) };
}

/** Everything Home shows beyond the sections (REQ-173). */
export interface HomeView {
  next: NextStep;
  route: RouteState[];
  cost: { total: number; minutes: number; runs: number } | null;
  activity: Activity[];
}

/**
 * The brief's modules, in order (A9): its front matter's `modules: [a, b]`,
 * else its `## Module: <name>` sections.
 */
export function briefModuleNames(brief: string): string[] {
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(brief)?.[1] ?? "";
  const list = /^modules:\s*\[([^\]]*)\]/m.exec(front)?.[1];
  if (list !== undefined)
    return list
      .split(",")
      .map((m) => m.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  return [...brief.matchAll(/^##\s+Module:\s*([^\r\n]+?)\s*$/gm)].map((m) => m[1]!);
}
