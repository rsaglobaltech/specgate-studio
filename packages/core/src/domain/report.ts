import type { Finding } from "./finding.js";

/**
 * Report (draft-report REQ-131, REQ-132): built of the total, scenarios
 * proven, the two coverages, the mutation score, the cost and the time — for
 * the project or one module — and the last gate specgate recorded, stage by
 * stage. Each read from specgate 0.34's JSON (A4, A7, A8): `status --json`
 * (each requirement's `capability`), `report --json` (`coverage.lines`),
 * `matrix --json` (`scenarios`), `harness report --json [--capability]`
 * (`quality`, `costByProfile`, `measuredCost`, `estimatedCost`, `totalMs`) and
 * `check --last --json` (`lastCheck`). A figure specgate has not measured is
 * not measured with the command that measures it, never 0 (A5). Pure.
 */

/** What measures a figure specgate has not measured yet (A5). */
export const MEASURE_COMMAND = {
  /** Diff coverage and mutation: the quality checks. */
  quality: "specgate quality init --level strict",
  /** Scenarios proven: the gate, which proves them. */
  scenarios: "specgate check",
  /** Cost and time: a build by the harness. */
  build: "specgate harness run",
  /** The project's line coverage: `report` reads it from a coverage report (specgate REQ-499). */
  lines: "specgate report",
} as const;

/** A figure: its value when specgate measured it, else the command that does — and specgate's fix, when it gave one. */
export type Figure<T> =
  { measured: true; value: T } | { measured: false; command: string; fix?: string };

/** Tokens an agent used, as specgate's run ledger counts them (specgate REQ-509). */
export interface Usage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

/**
 * The cost (Q2, A14): measured from the agent's tokens at the prices its
 * profile declares — an API price, never a charge: specgate cannot tell an
 * agent on a subscription from one on an API key — else the estimate per
 * profile, else the usage alone when tokens were counted but no price is set.
 */
export interface ReportCost {
  basis: "measured" | "estimated" | "usage";
  /** In the unit of the profile's prices or hint; null for `usage`. */
  total: number | null;
  /** The profiles it comes from. */
  profiles: string[];
  /** The tokens counted, every profile together; null when none were. */
  tokens: Usage | null;
  /** For `usage`: the key whose price would measure it, `profiles.<name>.price_per_input_token`. */
  priceKey?: string;
}

/** One module in "By module" (A3): built of its total, its diff coverage, the questions it waits for. */
export interface ReportModule {
  name: string;
  built: { done: number; total: number };
  /** The harness's diff coverage, mean over its requirements; null when not measured. */
  diffCoverage: number | null;
  /** Requirements of it waiting for an answer. */
  waiting: number;
}

/** A requirement not built yet, and why (the board's "What is missing, and why"). */
export interface ReportMissing {
  id: string;
  title: string;
  /** specgate's category: NEEDS_TEST, NEEDS_EVERYTHING, WAITING_FOR_ANSWER… */
  category: string;
  /** specgate's words for what it needs, when it says. */
  needs: string | null;
  /** The open question it waits for. */
  question?: { id: string; text: string };
}

export type StageResult = "passed" | "failed" | "not_configured" | "not_run" | "skipped";

/** One stage of the gate as specgate recorded it (REQ-132, specgate REQ-503). */
export interface GateStage {
  /** specgate's name: ids, changes, validate, architecture, tests, quality. */
  stage: string;
  /** A quality check's name. */
  name?: string;
  command: string | null;
  result: StageResult;
  ms: number | null;
  /** What it found; for a stage that failed, specgate's code and fix. */
  findings: Finding[];
}

/** The last gate specgate recorded for the project (REQ-132, specgate REQ-504), or none yet. */
export type GateView =
  | {
      ran: true;
      /** When it ran, ISO 8601. */
      at: string;
      passed: boolean;
      branch: string | null;
      commit: string | null;
      stages: GateStage[];
    }
  | { ran: false; command: string };

export interface ReportView {
  /** The modules, in the order their requirements come, each with its figures (A3). */
  modules: ReportModule[];
  /** The module shown; null for the whole project. */
  module: string | null;
  /** Requirements built (Implemented, Verified or Released) of the total (A2). */
  built: { done: number; total: number };
  /** Scenarios a test names whose requirement is built and the last gate passed, of the total (A2). */
  scenarios: Figure<{ proven: number; total: number }>;
  /** The harness's diff coverage, a mean over the requirements it built, in % (A13). */
  diffCoverage: Figure<number>;
  /** The project's line coverage, in %, from the coverage report specgate read (A13, specgate REQ-499). */
  lineCoverage: Figure<number>;
  /** The mutation score, in %. */
  mutation: Figure<number>;
  cost: Figure<ReportCost>;
  /** The time spent building. */
  time: Figure<{ ms: number }>;
  /** What is not built yet, and why. */
  missing: ReportMissing[];
  /** The last gate, by stage (REQ-132). */
  gate: GateView;
}

/** What Report reads, as specgate's `--json` answers. */
export interface ReportInput {
  module: string | null;
  /** `status --json`. */
  status: unknown;
  /** `report --json`, and its findings: `coverage_not_measured` with how to measure it. */
  report: unknown;
  reportFindings?: Finding[];
  /** `matrix --json`. */
  matrix: unknown;
  /** `harness report --json` for the project: per-requirement quality for every module. */
  harness: unknown;
  /** `harness report --capability <module> --json`, when a module is chosen. */
  harnessModule?: unknown;
  /** `check --last --json`. */
  lastCheck: unknown;
  /** `questions --json`: what a waiting requirement waits for. */
  questions?: unknown;
}

const DONE_STATUSES = new Set(["Implemented", "Verified", "Released"]);

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null;
const list = (v: unknown): Obj[] =>
  Array.isArray(v) ? v.map(obj).filter((x): x is Obj => x !== null) : [];
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const notMeasured = (command: string, fix?: string): Figure<never> => ({
  measured: false,
  command,
  ...(fix ? { fix } : {}),
});
const percent = (v: unknown, command: string): Figure<number> => {
  const n = num(v);
  return n === null ? notMeasured(command) : { measured: true, value: n };
};
const mean = (xs: number[]) =>
  xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;

interface Req {
  id: string;
  title: string;
  module: string;
  done: boolean;
  category: string;
  needs: string | null;
}

/**
 * Each requirement with its module (A3): its `capability` in `status --json`
 * (specgate 0.34, REQ-500), else its open change's (`draft-pagos` → pagos),
 * else its feature's folder, else "spec".
 */
function requirementsOf(status: unknown, report: unknown): Req[] {
  const featureOf = new Map<string, string>();
  const statusOf = new Map<string, string>();
  for (const r of list(obj(report)?.requirements)) {
    const id = str(r.requirement);
    if (!id) continue;
    const m = /^features\/([^/]+)\//.exec(String(r.featureFile ?? "").replace(/`/g, ""));
    if (m) featureOf.set(id, m[1]!);
    const s = str(r.status);
    if (s) statusOf.set(id, s);
  }
  return list(obj(status)?.requirements)
    .filter((r) => str(r.id))
    .map((r) => {
      const id = str(r.id)!;
      const change = str(r.change);
      return {
        id,
        title: str(r.title) ?? "",
        module:
          str(r.capability) ??
          (change ? change.replace(/^draft-/, "") : (featureOf.get(id) ?? "spec")),
        done: r.category === "DONE" || DONE_STATUSES.has(statusOf.get(id) ?? ""),
        category: str(r.category) ?? "",
        needs: str(r.needs),
      };
    });
}

/** Scenarios proven of the total (A2): a test names it, its requirement is built, and the last gate passed. */
function scenariosOf(
  matrix: unknown,
  ids: ReadonlySet<string>,
  gate: GateView,
): Figure<{ proven: number; total: number }> {
  const rows = obj(obj(matrix)?.matrix)?.scenarios;
  if (!Array.isArray(rows)) return notMeasured(MEASURE_COMMAND.scenarios);
  if (!gate.ran) return notMeasured(MEASURE_COMMAND.scenarios);
  const mine = list(rows).filter((r) => str(r.scenario) && ids.has(String(r.requirement)));
  const proven = gate.passed
    ? mine.filter(
        (r) =>
          DONE_STATUSES.has(String(r.status ?? "")) &&
          !(Array.isArray(r.gaps) && r.gaps.includes("test")),
      ).length
    : 0;
  return { measured: true, value: { proven, total: mine.length } };
}

/** The tokens of every profile together; null when none were counted. */
function usageOf(profiles: Obj[]): Usage | null {
  const counted = profiles.map((p) => obj(p.tokens)).filter((t): t is Obj => t !== null);
  if (!counted.length) return null;
  const sum = (k: string) => counted.reduce((a, t) => a + (num(t[k]) ?? 0), 0);
  return {
    input: sum("input"),
    output: sum("output"),
    cacheRead: sum("cacheRead"),
    cacheWrite: sum("cacheWrite"),
  };
}

/** The cost (A14): measured from tokens, else estimated per profile, else the usage alone. */
function costOf(h: Obj | null): Figure<ReportCost> {
  const profiles = list(h?.costByProfile);
  const named = (basis: "measured" | "estimated") =>
    profiles
      .filter((p) => num(p[basis]) !== null)
      .map((p) => str(p.profile))
      .filter((p): p is string => p !== null);
  const money = (n: number) => Math.round(n * 100) / 100;
  const tokens = usageOf(profiles);
  const measured = num(obj(h?.measuredCost)?.total);
  if (measured !== null)
    return {
      measured: true,
      value: { basis: "measured", total: money(measured), profiles: named("measured"), tokens },
    };
  const estimated = num(obj(h?.estimatedCost)?.total);
  if (estimated !== null)
    return {
      measured: true,
      value: { basis: "estimated", total: money(estimated), profiles: named("estimated"), tokens },
    };
  if (tokens) {
    const used = profiles.filter((p) => obj(p.tokens)).map((p) => str(p.profile) ?? "agent");
    return {
      measured: true,
      value: {
        basis: "usage",
        total: null,
        profiles: used,
        tokens,
        priceKey: `profiles.${used[0] ?? "<name>"}.price_per_input_token`,
      },
    };
  }
  return notMeasured(MEASURE_COMMAND.build);
}

const RESULTS: Record<string, StageResult> = {
  passed: "passed",
  failed: "failed",
  "not run": "not_run",
  skipped: "skipped",
};

/**
 * The last gate from `check --last --json` (REQ-132): each stage as specgate
 * recorded it; an architecture with no command is not configured; none
 * recorded names `specgate check` (A8, `last_check_none`).
 */
export function gateOf(data: unknown): GateView {
  const last = obj(obj(data)?.lastCheck);
  const at = str(last?.ranAt);
  if (!last || !at) return { ran: false, command: "specgate check" };
  const stages: GateStage[] = list(last.stages).map((s) => {
    const stage = str(s.stage) ?? "";
    const command = str(s.command);
    let result = RESULTS[String(s.result)] ?? "not_run";
    if (result === "skipped" && command === null && stage === "architecture")
      result = "not_configured";
    const name = str(s.name);
    return {
      stage,
      ...(name ? { name } : {}),
      command,
      result,
      ms: num(s.ms),
      findings: list(s.findings).map((f) => ({
        severity: (["error", "warning", "info"].includes(String(f.severity))
          ? f.severity
          : "info") as Finding["severity"],
        code: str(f.code) ?? "",
        message: str(f.message) ?? "",
        ...(str(f.fix) ? { fix: str(f.fix)! } : {}),
      })),
    };
  });
  return {
    ran: true,
    at,
    passed: last.passed === true,
    branch: str(last.branch),
    commit: str(last.commit),
    stages,
  };
}

/** What a waiting requirement waits for: the first open question that blocks it. */
function questionOf(questions: unknown, id: string): { id: string; text: string } | undefined {
  const open = list(obj(obj(questions)?.questions)?.open);
  const q = open.find((x) => Array.isArray(x.blocks) && x.blocks.includes(id));
  return q && str(q.id) ? { id: str(q.id)!, text: str(q.text) ?? "" } : undefined;
}

/** Report for the project, or for `input.module` (REQ-131, REQ-132). */
export function reportOf(input: ReportInput): ReportView {
  const all = requirementsOf(input.status, input.report);
  const names = [...new Set(all.map((r) => r.module))];
  const mine = input.module === null ? all : all.filter((r) => r.module === input.module);
  const whole = obj(obj(input.harness)?.report);
  const h = input.module === null ? whole : obj(obj(input.harnessModule)?.report);
  const quality = obj(h?.quality);
  const ms = num(h?.totalMs);
  const gate = gateOf(input.lastCheck);
  // Each requirement's diff coverage, as the harness measured it (specgate REQ-222).
  const coverageOf = new Map<string, number>();
  for (const r of list(obj(whole?.quality)?.requirements)) {
    const c = num(r.coverage);
    if (c !== null && str(r.requirement)) coverageOf.set(str(r.requirement)!, c);
  }
  const lines = obj(obj(obj(input.report)?.coverage)?.lines);
  const linesFix = (input.reportFindings ?? []).find(
    (f) => f.code === "coverage_not_measured",
  )?.fix;
  return {
    modules: names.map((name) => {
      const reqs = all.filter((r) => r.module === name);
      return {
        name,
        built: { done: reqs.filter((r) => r.done).length, total: reqs.length },
        diffCoverage: mean(reqs.map((r) => coverageOf.get(r.id)).filter((c) => c !== undefined)),
        waiting: reqs.filter((r) => r.category === "WAITING_FOR_ANSWER").length,
      };
    }),
    module: input.module,
    built: { done: mine.filter((r) => r.done).length, total: mine.length },
    scenarios: scenariosOf(input.matrix, new Set(mine.map((r) => r.id)), gate),
    diffCoverage: percent(quality?.coverage, MEASURE_COMMAND.quality),
    lineCoverage:
      num(lines?.percent) !== null
        ? { measured: true, value: num(lines!.percent)! }
        : notMeasured(MEASURE_COMMAND.lines, linesFix),
    mutation: percent(quality?.mutation, MEASURE_COMMAND.quality),
    cost: costOf(h),
    time:
      ms !== null && (num(h?.runs) ?? 0) > 0
        ? { measured: true, value: { ms } }
        : notMeasured(MEASURE_COMMAND.build),
    missing: mine
      .filter((r) => !r.done)
      .map((r) => {
        const question =
          r.category === "WAITING_FOR_ANSWER" ? questionOf(input.questions, r.id) : undefined;
        return {
          id: r.id,
          title: r.title,
          category: r.category,
          needs: r.needs,
          ...(question ? { question } : {}),
        };
      }),
    gate,
  };
}
