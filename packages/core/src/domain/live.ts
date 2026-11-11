/**
 * Live (draft-build-live REQ-103): each requirement's steps with their time,
 * the agent's output as it streams, the queue, cost and tokens — folded from
 * the harness's events (A9), the JSON lines specgate writes to
 * `.harness/events/<REQ>.jsonl` (its ADR-0037), never from its prose. A
 * second tab or a reload folds the same lines, so it sees the same.
 */

/** One harness event line, as specgate writes it. */
export type HarnessEvent = Record<string, unknown> & { t?: number; type?: string };

/** Tokens and cost: the agent's own count, as its events report it. */
export interface Usage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  /** Dollars, when the agent reports them. */
  cost: number | null;
}

export type StepResult = "ok" | "error" | "pass" | "fail" | "running";

export interface LiveStep {
  /** read, search, edit, write, shell, test, gate, agent… as specgate names it. */
  kind: string;
  /** What it worked on: a file, a command, the gate's stage. */
  label: string;
  /** How long it took, in seconds; null while it runs. */
  seconds: number | null;
  result: StepResult;
  /** When it started, epoch seconds: a running step's time is counted from it. */
  since: number;
}

export type LiveState = "running" | "pass" | "fail" | "question" | "stopped";

export interface LiveRequirement {
  req: string;
  attempt: number;
  state: LiveState;
  /** Its steps in order, the running one last. */
  steps: LiveStep[];
  /** What the agent asked instead of guessing (REQ-104). */
  question: string | null;
  usage: Usage | null;
}

export interface LiveLine {
  t: number;
  req: string;
  kind: "message" | "step" | "gate" | "question";
  text: string;
}

export interface LiveView {
  /** The requirement the studio is building, or null. */
  building: string | null;
  /** The requirements queued after it, in order. */
  queue: string[];
  /** A stop after this requirement was asked (REQ-105). */
  stopping: boolean;
  /** Epoch seconds the run being shown started at: what is counted is since then. */
  since: number;
  /** Every requirement of the run, the most recently active first. */
  requirements: LiveRequirement[];
  /** The agent's output since then, oldest first: its messages, steps and the gate. */
  output: LiveLine[];
  /** Cost and tokens spent so far, every attempt counted. */
  totals: Usage;
  /** What the agent asked while it built, and its answer once given (REQ-104). */
  questions: LiveQuestion[];
}

/**
 * A question the agent asked instead of guessing (REQ-104): its text from the
 * harness's events, and — once specgate recorded it — its id, change, the
 * options listed and the answer, from `specgate questions --json`.
 */
export interface LiveQuestion {
  req: string;
  text: string;
  /** `Q3`; null until specgate recorded it, when the agent's run ends. */
  id: string | null;
  change: string | null;
  options: string[];
  /** The answer given, waiting for "The spec says it"; null while it is open. */
  answer: string | null;
}

/** What the studio knows that the events do not: what it builds, queues and stopped. */
export interface LiveStudio {
  building: string | null;
  queue: readonly string[];
  stopping: boolean;
  /** The requirements whose build the studio ended (REQ-105). */
  stopped: ReadonlySet<string>;
}

/** The output kept: the last lines, enough to read back, never the whole history. */
export const OUTPUT_LIMIT = 500;

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const text = (v: unknown): string => (typeof v === "string" ? v : "");

/** The lines of one events file; one being written, or not JSON, is skipped. */
export function parseEvents(jsonl: string): HarnessEvent[] {
  const out: HarnessEvent[] = [];
  for (const line of jsonl.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line) as unknown;
      if (e && typeof e === "object" && !Array.isArray(e)) out.push(e as HarnessEvent);
    } catch {
      /* a line being written */
    }
  }
  return out;
}

/** The usage lines folded: the final ones summed, else the last live count of output tokens. */
export function foldUsage(events: readonly HarnessEvent[]): Usage | null {
  const usages = events.filter((e) => e.type === "usage");
  if (usages.length === 0) return null;
  const finals = usages.filter((e) => e.final === true);
  const live = usages.filter((e) => e.final !== true);
  const sum = (k: string) => finals.reduce((a, e) => a + num(e[k]), 0);
  const costs = finals.filter((e) => typeof e.cost === "number");
  return {
    input: sum("input"),
    output: finals.length ? sum("output") : num(live[live.length - 1]?.output),
    cacheRead: sum("cacheRead"),
    cacheWrite: sum("cacheWrite"),
    cost: costs.length ? costs.reduce((a, e) => a + num(e.cost), 0) : null,
  };
}

const round = (s: number) => Math.round(s * 10) / 10;

/** One requirement's last attempt: its steps with their time, how it stands, what it asked. */
export function foldRequirement(
  req: string,
  events: readonly HarnessEvent[],
  studio: LiveStudio,
): LiveRequirement | null {
  if (events.length === 0) return null;
  const lastStart = events
    .map((e) => e.type === "attempt" && e.state === "start")
    .lastIndexOf(true);
  const mine = lastStart >= 0 ? events.slice(lastStart) : events;
  const end = [...mine].reverse().find((e) => e.type === "attempt" && e.state === "end");
  const steps: LiveStep[] = [];
  const open = new Map<string, LiveStep>();
  for (const e of mine) {
    if (e.type === "step") {
      const started = num(e.started) || num(e.t);
      steps.push({
        kind: text(e.kind) || "other",
        label: text(e.target) || text(e.tool),
        seconds: e.ended !== undefined ? round(Math.max(0, num(e.ended) - started)) : null,
        result: e.result === "error" ? "error" : "ok",
        since: started,
      });
    } else if (e.type === "gate-start") {
      const step: LiveStep = {
        kind: "gate",
        label: text(e.stage),
        seconds: null,
        result: "running",
        since: num(e.t),
      };
      open.set(text(e.stage), step);
      steps.push(step);
    } else if (e.type === "gate") {
      const stage = text(e.stage);
      // A stage's end may say what it measured after its name ("quality: coverage 91%").
      const key = [...open.keys()].find((k) => stage.startsWith(k));
      const step = key !== undefined ? open.get(key)! : undefined;
      if (key !== undefined) open.delete(key);
      const result: StepResult = e.result === "pass" ? "pass" : "fail";
      const seconds = e.ms !== undefined ? round(num(e.ms) / 1000) : null;
      if (step) Object.assign(step, { label: stage, result, seconds });
      else steps.push({ kind: "gate", label: stage, seconds, result, since: num(e.t) });
    }
  }
  const asked = [...mine].reverse().find((e) => e.type === "question");
  const state: LiveState = end
    ? end.result === "pass"
      ? "pass"
      : end.result === "question"
        ? "question"
        : end.stage === "stopped"
          ? "stopped"
          : "fail"
    : studio.building === req && !studio.stopped.has(req)
      ? "running"
      : "stopped";
  // While the agent works, its current step is known only once it ends: it is "the agent".
  if (state === "running" && open.size === 0) {
    const last = mine[mine.length - 1]!;
    const after = Math.max(num(last.t), ...steps.map((s) => s.since + (s.seconds ?? 0)));
    steps.push({ kind: "agent", label: "", seconds: null, result: "running", since: after });
  }
  if (state !== "running") {
    // What was running when it ended did not finish.
    for (const s of steps) if (s.result === "running") s.result = "fail";
  }
  return {
    req,
    attempt: num(mine[0]?.attempt) || 1,
    state,
    steps,
    question: asked ? text(asked.text) : null,
    usage: foldUsage(mine),
  };
}

/** One event as a line of the agent's output, or null for one that says nothing to read. */
function lineOf(req: string, e: HarnessEvent): LiveLine | null {
  const t = num(e.t);
  if (e.type === "message") return { t, req, kind: "message", text: text(e.text) };
  if (e.type === "question") return { t, req, kind: "question", text: text(e.text) };
  if (e.type === "step")
    return {
      t,
      req,
      kind: "step",
      text: `${text(e.tool) || text(e.kind)} ${text(e.target)}${e.result === "error" ? " — error" : ""}`.trim(),
    };
  if (e.type === "gate")
    return { t, req, kind: "gate", text: `gate ${text(e.stage)}: ${text(e.result)}` };
  return null;
}

/**
 * Live (REQ-103): the requirements with events since `since` — the run being
 * shown — each with its steps, the agent's output in order, the queue the
 * studio keeps, and the cost and tokens of every attempt since then.
 */
export function foldLive(
  files: Readonly<Record<string, string>>,
  since: number,
  studio: LiveStudio,
): LiveView {
  const requirements: Array<LiveRequirement & { updated: number }> = [];
  const output: LiveLine[] = [];
  const totals: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: null };
  for (const [req, jsonl] of Object.entries(files)) {
    const events = parseEvents(jsonl).filter((e) => num(e.t) >= since);
    if (events.length === 0) continue;
    const usage = foldUsage(events);
    if (usage) {
      totals.input += usage.input;
      totals.output += usage.output;
      totals.cacheRead += usage.cacheRead;
      totals.cacheWrite += usage.cacheWrite;
      if (usage.cost !== null) totals.cost = (totals.cost ?? 0) + usage.cost;
    }
    const folded = foldRequirement(req, events, studio);
    if (folded) requirements.push({ ...folded, updated: num(events[events.length - 1]!.t) });
    for (const e of events) {
      const line = lineOf(req, e);
      if (line && line.text) output.push(line);
    }
  }
  requirements.sort((a, b) => b.updated - a.updated || a.req.localeCompare(b.req));
  // In time order; within a second, as each file wrote them.
  output.sort((a, b) => a.t - b.t);
  if (totals.cost !== null) totals.cost = Math.round(totals.cost * 10_000) / 10_000;
  return {
    building: studio.building,
    queue: [...studio.queue],
    stopping: studio.stopping,
    since,
    requirements: requirements.map(({ updated: _, ...r }) => r),
    output: output.slice(-OUTPUT_LIMIT),
    totals,
    questions: [],
  };
}

interface QuestionRow {
  id?: unknown;
  change?: unknown;
  text?: unknown;
  blocks?: unknown;
  options?: unknown;
  asked?: unknown;
  answer?: unknown;
}

/**
 * The agent's questions of the run (REQ-104), each matched to the row
 * specgate recorded for it in `questions --json` — the open one, or the one
 * answered and waiting for review: the same requirement and text, else the
 * question the agent asked about that requirement while it built.
 */
export function liveQuestions(
  requirements: readonly LiveRequirement[],
  section: unknown,
): LiveQuestion[] {
  const q = (section as { questions?: { open?: unknown; answered?: unknown } } | null)?.questions;
  const rows = (v: unknown) => (Array.isArray(v) ? (v as QuestionRow[]) : []);
  const open = rows(q?.open);
  const answered = rows(q?.answered);
  const blocks = (r: QuestionRow, req: string) => Array.isArray(r.blocks) && r.blocks.includes(req);
  const find = (list: QuestionRow[], req: string, asked: string) =>
    list.find((r) => blocks(r, req) && r.text === asked) ??
    list.find((r) => blocks(r, req) && r.asked === "build");
  const out: LiveQuestion[] = [];
  for (const r of requirements) {
    if (!r.question) continue;
    const isOpen = find(open, r.req, r.question);
    const row = isOpen ?? find(answered, r.req, r.question);
    out.push({
      req: r.req,
      text: r.question,
      id: typeof row?.id === "string" ? row.id : null,
      change: typeof row?.change === "string" ? row.change : null,
      options: Array.isArray(row?.options)
        ? row.options.filter((o): o is string => typeof o === "string")
        : [],
      answer: !isOpen && typeof row?.answer === "string" ? row.answer : null,
    });
  }
  return out;
}

/** When the last run specgate recorded started, from `queue.json`; null when it says none. */
export function queueStarted(queue: string | null): number | null {
  if (!queue) return null;
  try {
    const t = (JSON.parse(queue) as { t?: unknown } | null)?.t;
    return typeof t === "number" && Number.isFinite(t) ? t : null;
  } catch {
    return null;
  }
}
