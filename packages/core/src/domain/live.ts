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
  /** Dollars, when the agent reports them: on a subscription, what it would cost at API prices (REQ-211). */
  cost: number | null;
  /** The agent's turns, when its final usage counts them (REQ-211). */
  turns: number | null;
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

/**
 * The harness's stages, as the "En vivo" board names them (draft-live-polish
 * REQ-103, A2, A3): the branch, the setup, the agent writing, the gate's
 * validate, tests and architecture (and any other stage the project
 * configures), then apply and commit on its branch.
 */
export type StageId =
  "branch" | "setup" | "agent" | "validate" | "tests" | "architecture" | "gate" | "apply";

/** ✓ done, ● running, ○ waiting, ✗ failed; a gate stage the harness skipped. */
export type StageMark = "done" | "running" | "waiting" | "failed" | "skipped";

export interface LiveStage {
  id: StageId;
  /** What it ran: the setup's or the gate's command, another gate stage's name; "" for the rest. */
  label: string;
  mark: StageMark;
  /** How long it took, in seconds; null while it runs, or when nothing says. */
  seconds: number | null;
  /** When it started, epoch seconds: a running stage's timer counts from it. */
  since: number | null;
  /** The tests the gate counted, when it says. */
  pass: number | null;
  fail: number | null;
}

/** One attempt of a requirement (INTENTOS): how it ended, and where a failed one stopped. */
export interface LiveAttempt {
  attempt: number;
  result: "running" | "pass" | "fail" | "question";
  /** The stage a failed attempt ended on: `Gate: tests`' stage, `agent-timeout`… */
  stage: string | null;
  seconds: number | null;
}

/**
 * One line of SALIDA DEL AGENTE (draft-live-polish REQ-201, A6): one action
 * of the agent — `read`, `search`, `edit`, `write`, `run`, `ask`, or the
 * tool's name — on its target, with what specgate's events say of it: the
 * lines an edit added and the tests a run counted, once they carry them (Q1, A7).
 */
export interface LogLine {
  t: number;
  req: string;
  verb: string;
  /** What it worked on, as it reads in one row: inside the worktree, relative; a chain, its first command and "…". */
  target: string;
  /** The target as the agent wrote it, for the hover and the expanded line. */
  full: string;
  result: "ok" | "error" | null;
  added: number | null;
  removed: number | null;
  pass: number | null;
  fail: number | null;
}

export interface LiveRequirement {
  req: string;
  attempt: number;
  state: LiveState;
  /** Its steps in order, the running one last. */
  steps: LiveStep[];
  /** What the agent asked instead of guessing (REQ-104). */
  question: string | null;
  usage: Usage | null;
  /** The harness's stages of the attempt in progress, in the board's order (REQ-103). */
  stages: LiveStage[];
  /** Every attempt so far, the current one last (INTENTOS). */
  attempts: LiveAttempt[];
  /** The attempts the harness allows. */
  maxAttempts: number;
  /** The branch it is built on: `harness/REQ-NNN`. */
  branch: string;
  /** How long it took, seconds: from its turn to its last event (TERMINADOS). */
  seconds: number | null;
}

export interface LiveLine {
  t: number;
  req: string;
  /** `output`: the agent's own output, as `harness run --format jsonl` streams it (specgate REQ-496). */
  kind: "message" | "step" | "gate" | "question" | "output";
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
  /** The agent's own words since then, oldest first: its messages and its output (the AGENTE tab, A3). */
  output: LiveLine[];
  /** SALIDA DEL AGENTE: one line per action of the agent, oldest first (REQ-201). */
  log: LogLine[];
  /** Each queued requirement's estimate, minutes; null when specgate has none (A5). */
  estimates: Record<string, number | null>;
  /** The last event of the run once nothing builds, epoch seconds: the elapsed time stops there. */
  ended: number | null;
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
  /** When the studio started each requirement, epoch seconds: "Rama creada" counts from it (A3). */
  startedAt?: Readonly<Record<string, number>>;
  /** The attempts the harness allows: `run-start`'s `maxAttempts`, else 3. */
  maxAttempts?: number;
  /** The queued requirements' estimates, minutes (A5). */
  estimates?: Readonly<Record<string, number | null>>;
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
  const turns = finals.filter((e) => typeof e.turns === "number");
  return {
    input: sum("input"),
    output: finals.length ? sum("output") : num(live[live.length - 1]?.output),
    cacheRead: sum("cacheRead"),
    cacheWrite: sum("cacheWrite"),
    cost: costs.length ? costs.reduce((a, e) => a + num(e.cost), 0) : null,
    turns: turns.length ? turns.reduce((a, e) => a + num(e.turns), 0) : null,
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
  const maxAttempts = studio.maxAttempts ?? DEFAULT_ATTEMPTS;
  const since = studio.startedAt?.[req] ?? null;
  const last = num(events[events.length - 1]!.t);
  const done = state !== "running";
  return {
    req,
    attempt: num(mine[0]?.attempt) || 1,
    state,
    steps,
    question: asked ? text(asked.text) : null,
    usage: foldUsage(mine),
    stages: foldStages(events, mine, state, since),
    attempts: foldAttempts(events, state),
    maxAttempts,
    branch: `harness/${req}`,
    seconds: done ? round(Math.max(0, last - (since ?? num(events[0]!.t)))) : null,
  };
}

/** The attempts specgate allows by default (its HarnessConfig). */
export const DEFAULT_ATTEMPTS = 3;

/** A gate stage as the board names it (A3): `validate --strict`, `test command: npm test`… */
function gateOf(stage: string): { id: StageId; label: string } {
  if (/^validate\b/.test(stage))
    return { id: "validate", label: stage.replace(/^validate\s*/, "") };
  const test = /^(?:post-merge )?test command(?:: (.*))?$/s.exec(stage);
  if (test) return { id: "tests", label: test[1] ?? "" };
  const arch = /^architecture check(?:: (.*))?$/s.exec(stage);
  if (arch) return { id: "architecture", label: arch[1] ?? "" };
  return { id: "gate", label: stage };
}

const stage = (id: StageId, label = ""): LiveStage => ({
  id,
  label,
  mark: "waiting",
  seconds: null,
  since: null,
  pass: null,
  fail: null,
});

/**
 * The harness's stages of one requirement (REQ-103, A3), from its events:
 * "Rama creada" running from its turn, done at its first event, timed only
 * by an event of specgate's that gives the branch its time (`branch` or
 * `worktree` with `ms`; specgate 0.34.0 writes none), never by the wait
 * before the first event (demo-findings A3); the setup's gate stage; the agent from its attempt's start
 * to its end or the gate's first stage; the gate's stages; apply once it passed.
 */
export function foldStages(
  all: readonly HarnessEvent[],
  mine: readonly HarnessEvent[],
  state: LiveState,
  since: number | null,
): LiveStage[] {
  const running = state === "running";
  const branch = stage("branch");
  if (all.length === 0) Object.assign(branch, { mark: running ? "running" : "failed", since });
  else {
    const made = all.find(
      (e) => (e.type === "branch" || e.type === "worktree") && typeof e.ms === "number",
    );
    Object.assign(branch, {
      mark: "done",
      since,
      seconds: made ? round(num(made.ms) / 1000) : null,
    });
  }
  const out: LiveStage[] = [branch];
  // A stage's start, then its end: the gate's, the setup's.
  const gates = new Map<string, LiveStage>();
  const track = (e: HarnessEvent, into: LiveStage) => {
    if (e.type === "gate-start") {
      Object.assign(into, { mark: "running", since: num(e.t), seconds: null });
    } else {
      const mark: StageMark =
        e.result === "pass" ? "done" : e.result === "skipped" ? "skipped" : "failed";
      Object.assign(into, {
        mark,
        seconds:
          e.ms !== undefined
            ? round(num(e.ms) / 1000)
            : into.since !== null
              ? round(num(e.t) - into.since)
              : null,
        pass: typeof e.pass === "number" ? e.pass : into.pass,
        fail: typeof e.fail === "number" ? e.fail : into.fail,
      });
    }
  };
  let setup: LiveStage | null = null;
  for (const e of all) {
    if (e.type !== "gate-start" && e.type !== "gate") continue;
    const name = text(e.stage);
    if (!name.startsWith("setup:")) continue;
    setup ??= stage("setup", name.slice("setup:".length).trim());
    track(e, setup);
  }
  if (setup) out.push(setup);

  const agent = stage("agent");
  const start = mine.find((e) => e.type === "attempt" && e.state === "start");
  const agentStart = mine.find((e) => e.type === "agent-start");
  const agentEnd = mine.find((e) => e.type === "agent-end");
  const firstGate = mine.find(
    (e) => e.type === "gate-start" && !text(e.stage).startsWith("setup:"),
  );
  const end = [...mine].reverse().find((e) => e.type === "attempt" && e.state === "end");
  const from = start ?? agentStart;
  if (from) {
    const t0 = num(from.t);
    if (agentEnd) {
      const failed =
        agentEnd.timedOut === true ||
        (agentEnd.exit !== 0 && agentEnd.exit !== undefined && agentEnd.exit !== null);
      Object.assign(agent, {
        mark: failed ? "failed" : "done",
        since: t0,
        seconds:
          agentEnd.ms !== undefined ? round(num(agentEnd.ms) / 1000) : round(num(agentEnd.t) - t0),
      });
    } else if (firstGate) {
      Object.assign(agent, { mark: "done", since: t0, seconds: round(num(firstGate.t) - t0) });
    } else Object.assign(agent, { mark: "running", since: t0 });
  }
  out.push(agent);

  for (const id of ["validate", "tests", "architecture"] as const) {
    const s = stage(id);
    gates.set(id, s);
    out.push(s);
  }
  const others: LiveStage[] = [];
  for (const e of mine) {
    if (e.type !== "gate-start" && e.type !== "gate") continue;
    const name = text(e.stage);
    if (name.startsWith("setup:")) continue;
    const g = gateOf(name);
    let into = g.id === "gate" ? gates.get(`gate:${name}`) : gates.get(g.id);
    if (!into) {
      // A stage's end may say what it measured after its name ("quality: coverage 91%").
      const open = [...gates.entries()].find(
        ([k, v]) => k.startsWith("gate:") && name.startsWith(k.slice(5)) && v.mark === "running",
      );
      into = open?.[1];
    }
    if (!into) {
      into = stage("gate", g.label);
      gates.set(`gate:${name}`, into);
      others.push(into);
    }
    if (g.label && into.id !== "gate") into.label = g.label;
    track(e, into);
  }
  out.push(...others);

  const apply = stage("apply");
  if (state === "pass") {
    const merged = mine.find((e) => e.type === "merge");
    Object.assign(apply, {
      mark: "done",
      since: end ? num(end.t) : null,
      seconds: merged && end ? round(Math.max(0, num(merged.t) - num(end.t))) : null,
    });
  } else if (end?.result === "pass" && running)
    Object.assign(apply, { mark: "running", since: num(end.t) });
  out.push(apply);

  // An attempt that failed ends on its stage: the agent's, when no gate stage says it.
  if (end?.result === "fail" && !out.some((s) => s.mark === "failed")) {
    const where = text(end.stage);
    const at = /gate|test|validate|arch/.test(where) ? null : agent;
    if (at) at.mark = "failed";
  }
  if (!running) for (const s of out) if (s.mark === "running") s.mark = "failed";
  return out;
}

/** Every attempt of a requirement (INTENTOS): its result, where a failed one ended, its time. */
export function foldAttempts(all: readonly HarnessEvent[], state: LiveState): LiveAttempt[] {
  const out: LiveAttempt[] = [];
  let current: (LiveAttempt & { t: number; failedAt: string | null }) | null = null;
  for (const e of all) {
    if (e.type === "attempt" && e.state === "start") {
      current = {
        attempt: num(e.attempt) || out.length + 1,
        result: "running",
        stage: null,
        seconds: null,
        t: num(e.t),
        failedAt: null,
      };
      out.push(current);
    } else if (current && e.type === "gate" && e.result === "fail") {
      current.failedAt = gateLabel(text(e.stage));
    } else if (current && e.type === "attempt" && e.state === "end") {
      const r = e.result === "pass" || e.result === "question" ? e.result : "fail";
      current.result = r;
      current.seconds = round(Math.max(0, num(e.t) - current.t));
      if (r === "fail") current.stage = current.failedAt ?? (text(e.stage) || null);
    }
  }
  const last = out[out.length - 1];
  if (last && last.result === "running" && state !== "running") last.result = "fail";
  return out.map(({ attempt, result, stage, seconds }) => ({ attempt, result, stage, seconds }));
}

/** A gate stage's name as INTENTOS says where an attempt failed: `tests`, `validate`… */
function gateLabel(stage: string): string {
  const g = gateOf(stage);
  return g.id === "gate" ? stage : g.id;
}

/** The verb of one action (A6): what the agent did, as one word. */
function verbOf(kind: string, tool: string): string | null {
  if (kind === "read" || kind === "search" || kind === "edit" || kind === "write") return kind;
  if (kind === "test" || kind === "shell") return "run";
  if (kind === "gate") return null;
  return (tool || kind || "other").toLowerCase();
}

const count = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** The requirement's worktree in a path or a command: specgate's `…/specgate-harness-REQ-141-e79ed237`. */
const worktreeOf = (req: string) =>
  new RegExp(`[^\\s'"=;&|<>]*specgate-harness-${req.replace(/[^\w-]/g, "")}-[0-9a-f]+`, "g");

/** A command split at its top-level `&&`, `||`, `;` and `|`, quotes kept whole. */
function parts(command: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote: string | null = null;
  for (let i = 0; i < command.length; i++) {
    const c = command[i]!;
    if (quote) {
      if (c === "\\" && quote === '"') {
        cur += c + (command[i + 1] ?? "");
        i++;
        continue;
      }
      if (c === quote) quote = null;
      cur += c;
    } else if (c === "'" || c === '"') {
      quote = c;
      cur += c;
    } else if (c === ";" || c === "|" || (c === "&" && command[i + 1] === "&")) {
      if (command[i + 1] === c) i++;
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((p) => p.trim()).filter(Boolean);
}

/** A path inside the requirement's worktree, relative to it (A6). */
export function relativeTarget(target: string, req: string): string {
  return target.replace(new RegExp(`${worktreeOf(req).source}[\\\\/]?`, "g"), "") || ".";
}

/**
 * A command as one readable row (A6): the worktree's own `cd <worktree> &&`
 * and `D=<worktree>;` left out, paths inside it relative, and a chain shown
 * as its first meaningful command and "…".
 */
export function shortCommand(command: string, req: string): string {
  const ROOT = "\u0000";
  let s = command.replace(worktreeOf(req), ROOT);
  const first = s.split(/\r?\n/)[0]!;
  const more = first !== s;
  s = first;
  const lead = new RegExp(
    `^\\s*(?:[A-Za-z_]\\w*=${ROOT}|cd\\s+(?:${ROOT}|"?\\$\\{?[A-Za-z_]\\w*\\}?"?))\\s*$`,
  );
  const all = parts(s).filter((p) => !lead.test(p));
  const shown = (all[0] ?? "")
    .replace(new RegExp(`${ROOT}[\\\\/]`, "g"), "")
    .replace(/"?\$\{?D\}?"?[\\/]/g, "")
    .replace(new RegExp(ROOT, "g"), ".");
  return all.length > 1 || more ? `${shown} …` : shown;
}

/** One event as a line of SALIDA DEL AGENTE (REQ-201), or null for one that is not an action. */
export function logLineOf(req: string, e: HarnessEvent): LogLine | null {
  const t = num(e.t);
  if (e.type === "question")
    return {
      t,
      req,
      verb: "ask",
      target: text(e.text),
      full: text(e.text),
      result: null,
      added: null,
      removed: null,
      pass: null,
      fail: null,
    };
  if (e.type !== "step") return null;
  const verb = verbOf(text(e.kind), text(e.tool));
  if (!verb) return null;
  return {
    t,
    req,
    verb,
    target:
      verb === "run" ? shortCommand(text(e.target), req) : relativeTarget(text(e.target), req),
    full: text(e.target),
    result: e.result === "error" ? "error" : e.result === "ok" ? "ok" : null,
    // The counts specgate's events will carry (Q1, A7): shown once they are there.
    added: count(e.added),
    removed: count(e.removed),
    pass: count(e.pass),
    fail: count(e.fail),
  };
}

/** One event as the agent's own words (the AGENTE tab, A3), or null: its actions are the log's. */
function lineOf(req: string, e: HarnessEvent): LiveLine | null {
  const t = num(e.t);
  if (e.type === "message") return { t, req, kind: "message", text: text(e.text) };
  if (e.type === "output" && text(e.text).trim())
    return { t, req, kind: "output", text: text(e.text).trimEnd() };
  return null;
}

/**
 * `harness run --format jsonl`'s lines (specgate REQ-496, REQ-497), by
 * requirement, as the events files hold them: what Live folds while the run
 * goes on, as it comes, with the agent's output the files do not hold. The
 * run's own lines (`run-start`, `run-end`) name no requirement and are left out.
 */
export function streamByRequirement(lines: readonly string[]): Record<string, string> {
  const out: Record<string, string[]> = {};
  for (const line of lines) {
    let e: unknown;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    const req = (e as { req?: unknown } | null)?.req;
    if (typeof req !== "string" || !req) continue;
    (out[req] ??= []).push(line);
  }
  return Object.fromEntries(Object.entries(out).map(([r, l]) => [r, `${l.join("\n")}\n`]));
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
  const log: LogLine[] = [];
  let ended = 0;
  const totals: Usage = {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    cost: null,
    turns: null,
  };
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
      if (usage.turns !== null) totals.turns = (totals.turns ?? 0) + usage.turns;
    }
    const folded = foldRequirement(req, events, studio);
    if (folded) requirements.push({ ...folded, updated: num(events[events.length - 1]!.t) });
    for (const e of events) {
      const line = lineOf(req, e);
      if (line && line.text) output.push(line);
      const action = logLineOf(req, e);
      if (action) log.push(action);
    }
    ended = Math.max(ended, num(events[events.length - 1]!.t));
  }
  // Pressed, and nothing written yet: its branch is being made (A4) — Live is never empty.
  const building = studio.building;
  if (building && !studio.stopped.has(building) && !requirements.some((r) => r.req === building)) {
    const since = studio.startedAt?.[building] ?? null;
    requirements.push({
      req: building,
      attempt: 1,
      state: "running",
      steps: [],
      question: null,
      usage: null,
      stages: foldStages([], [], "running", since),
      attempts: [],
      maxAttempts: studio.maxAttempts ?? DEFAULT_ATTEMPTS,
      branch: `harness/${building}`,
      seconds: null,
      updated: Number.MAX_SAFE_INTEGER,
    });
  }
  requirements.sort((a, b) => b.updated - a.updated || a.req.localeCompare(b.req));
  // In time order; within a second, as each file wrote them.
  output.sort((a, b) => a.t - b.t);
  log.sort((a, b) => a.t - b.t);
  if (totals.cost !== null) totals.cost = Math.round(totals.cost * 10_000) / 10_000;
  return {
    building: studio.building,
    queue: [...studio.queue],
    stopping: studio.stopping,
    since,
    requirements: requirements.map(({ updated: _, ...r }) => r),
    output: output.slice(-OUTPUT_LIMIT),
    log: log.slice(-OUTPUT_LIMIT),
    estimates: Object.fromEntries(
      studio.queue.map((r) => [r, studio.estimates?.[r] ?? null] as const),
    ),
    ended: studio.building ? null : ended || null,
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
