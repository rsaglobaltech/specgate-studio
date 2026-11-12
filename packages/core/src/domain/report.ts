/**
 * Report's figures (draft-report REQ-131): built of the total, scenarios
 * proven, coverage, mutation score, cost and time, for the whole project or
 * one module, each read from specgate's JSON (A4). A figure specgate has not
 * measured — `null` or missing in its JSON — is not measured, with the
 * command that measures it, never 0 (A5). Pure.
 */

/** What measures a figure specgate has not measured yet (A5). */
export const MEASURE_COMMAND = {
  /** Coverage and mutation: the quality checks. */
  quality: "specgate quality init --level strict",
  /** Scenarios proven: the gate, which links scenarios to their tests. */
  scenarios: "specgate check",
  /** Cost and time: a build by the harness. */
  build: "specgate harness run",
} as const;

/** A figure: its value when specgate measured it, else the command that does. */
export type Figure<T> = { measured: true; value: T } | { measured: false; command: string };

/** The cost: measured from the agent's tokens, else the estimate per profile (A14). */
export interface ReportCost {
  total: number;
  basis: "measured" | "estimated";
  /** The agent profiles it comes from. */
  profiles: string[];
}

export interface ReportView {
  /** The modules, in the order their requirements come (A3). */
  modules: string[];
  /** The module shown; null for the whole project. */
  module: string | null;
  /** Requirements built (Implemented, Verified or Released) of the total (A2). */
  built: { done: number; total: number };
  /** Scenarios a test names whose requirement is built, of the total (A2). */
  scenarios: Figure<{ proven: number; total: number }>;
  /** The harness's diff coverage, a mean over the requirements it built, in % (A13). */
  diffCoverage: Figure<number>;
  /** The project's line coverage, in %, when a run measured it (A13). */
  lineCoverage: Figure<number>;
  /** The mutation score, in %. */
  mutation: Figure<number>;
  cost: Figure<ReportCost>;
  /** The time spent building. */
  time: Figure<{ ms: number }>;
}

/** What Report reads: `status`, `report`, `matrix --dry-run` and `harness report`, as `--json` answers. */
export interface ReportInput {
  module: string | null;
  status: unknown;
  report: unknown;
  matrix: unknown;
  /** `harness report --json`, of the module when one is chosen. */
  harness: unknown;
}

const DONE_STATUSES = new Set(["Implemented", "Verified", "Released"]);

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null;
const list = (v: unknown): Obj[] =>
  Array.isArray(v) ? v.map(obj).filter((x): x is Obj => x !== null) : [];
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const notMeasured = (command: string): Figure<never> => ({ measured: false, command });
const percent = (v: unknown, command: string): Figure<number> => {
  const n = num(v);
  return n === null ? notMeasured(command) : { measured: true, value: n };
};

/**
 * A requirement's module (A3), as Home's modules: an open change's
 * (`draft-pagos` → pagos), else its feature's folder (`features/pagos/…`),
 * else "spec".
 */
function moduleOfEach(status: unknown, report: unknown) {
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
        module: change ? change.replace(/^draft-/, "") : (featureOf.get(id) ?? "spec"),
        done: r.category === "DONE" || DONE_STATUSES.has(statusOf.get(id) ?? ""),
      };
    });
}

/** Scenarios proven of the total, from `matrix --json`'s rows per scenario (A2, A4). */
function scenariosOf(
  matrix: unknown,
  ids: ReadonlySet<string>,
): Figure<{ proven: number; total: number }> {
  const rows = obj(obj(matrix)?.matrix)?.scenarios;
  if (!Array.isArray(rows)) return notMeasured(MEASURE_COMMAND.scenarios);
  const mine = list(rows).filter((r) => str(r.scenario) && ids.has(String(r.requirement)));
  const proven = mine.filter(
    (r) =>
      DONE_STATUSES.has(String(r.status ?? "")) &&
      !(Array.isArray(r.gaps) && r.gaps.includes("test")),
  ).length;
  return { measured: true, value: { proven, total: mine.length } };
}

/** The cost measured from the agent's tokens, else the estimate per profile (A14). */
function costOf(h: Obj | null): Figure<ReportCost> {
  const profiles = list(h?.costByProfile);
  const named = (basis: "measured" | "estimated") =>
    profiles
      .filter((p) => num(p[basis]) !== null)
      .map((p) => str(p.profile))
      .filter((p): p is string => p !== null);
  const money = (n: number) => Math.round(n * 100) / 100;
  const measured = num(obj(h?.measuredCost)?.total);
  if (measured !== null)
    return {
      measured: true,
      value: { total: money(measured), basis: "measured", profiles: named("measured") },
    };
  const estimated = num(obj(h?.estimatedCost)?.total);
  if (estimated !== null)
    return {
      measured: true,
      value: { total: money(estimated), basis: "estimated", profiles: named("estimated") },
    };
  return notMeasured(MEASURE_COMMAND.build);
}

/** Report's figures for the project, or for `input.module` (REQ-131). */
export function reportOf(input: ReportInput): ReportView {
  const all = moduleOfEach(input.status, input.report);
  const modules = [...new Set(all.map((r) => r.module))];
  const mine = input.module === null ? all : all.filter((r) => r.module === input.module);
  const h = obj(obj(input.harness)?.report);
  const quality = obj(h?.quality);
  const ms = num(h?.totalMs);
  return {
    modules,
    module: input.module,
    built: { done: mine.filter((r) => r.done).length, total: mine.length },
    scenarios: scenariosOf(input.matrix, new Set(mine.map((r) => r.id))),
    diffCoverage: percent(quality?.coverage, MEASURE_COMMAND.quality),
    lineCoverage: percent(obj(obj(input.report)?.coverage)?.lines, MEASURE_COMMAND.quality),
    mutation: percent(quality?.mutation, MEASURE_COMMAND.quality),
    cost: costOf(h),
    time:
      ms !== null && (num(h?.runs) ?? 0) > 0
        ? { measured: true, value: { ms } }
        : notMeasured(MEASURE_COMMAND.build),
  };
}
