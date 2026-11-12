/**
 * Traceability (draft-traceability REQ-121 … REQ-123): one row per scenario,
 * read from specgate's per-scenario rows — `specgate matrix --json`'s
 * `matrix.scenarios`, or the API's `matrix()` (specgate 0.34.0) — never from
 * the prose of `docs/specs/traceability.md`, and never one row per
 * requirement. Filters keep the gaps, the rows without a test and the rows
 * waiting for an answer. "Fix" proposes the missing test as a skeleton written
 * from the scenario's GIVEN/WHEN/THEN, with no agent and no cost.
 */

/** A link a row may lack (specgate's `gaps`). */
export type TraceLink = "feature" | "test" | "code";

/** The filters, the first keeping every row (REQ-122). */
export const TRACE_FILTERS = ["all", "gaps", "noTest", "waiting"] as const;
export type TraceFilter = (typeof TRACE_FILTERS)[number];

/** One scenario of the project, as Traceability shows it (REQ-121). */
export interface TraceRow {
  requirement: string;
  /** The requirement's title, from `status --json`; null when it has none. */
  title: string | null;
  /** Null for a requirement with no scenario. */
  scenario: string | null;
  feature: string | null;
  tests: string[];
  code: string[];
  /** The requirement's status (A4): Draft, Approved, Implemented, … Needs Clarification. */
  status: string;
  /** What it lacks: a feature, a test, code. Empty when nothing. */
  gaps: TraceLink[];
  /** The open question that blocks its requirement (REQ-122), or its status says it waits. */
  waiting: { question: string | null; change: string | null } | null;
  /** The capability that states its requirement (`status --json`), null when only in spec.md. */
  capability: string | null;
  /** The filters that keep it (REQ-122): the UI decides nothing. */
  in: TraceFilter[];
}

/** What Traceability shows. */
export interface TraceView {
  /** False when specgate gives no per-scenario rows (older than 0.34.0): no interim view (A12). */
  available: boolean;
  rows: TraceRow[];
  /** How many rows each filter keeps (A10). */
  counts: Record<TraceFilter, number>;
  /** Scenarios a test names, of all the scenarios. */
  withTest: number;
  scenarios: number;
}

const LINKS: readonly TraceLink[] = ["feature", "test", "code"];
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const strings = (v: unknown): string[] =>
  (Array.isArray(v) ? v : [])
    .filter((x): x is string => typeof x === "string" && x !== "")
    .map((x) => x.replace(/\\/g, "/"));

/** specgate's statuses that hold whatever the other rows say (A4). */
const HOLDING = ["Needs Clarification", "Deprecated"];
/** The order a requirement's statuses go in: the furthest one is the requirement's. */
const ORDER = ["Draft", "Approved", "Implemented", "Verified", "Released"];

/**
 * The status of each requirement (A4). specgate 0.34.0 gives each row a
 * status, and a scenario no test names reads Draft though its requirement is
 * Approved: the requirement's status is the furthest of its rows', unless one
 * of them is held — Needs Clarification, Deprecated.
 */
function statusOf(statuses: string[]): string {
  const held = HOLDING.find((h) => statuses.includes(h));
  if (held) return held;
  let best = statuses[0] ?? "";
  for (const s of statuses) if (ORDER.indexOf(s) > ORDER.indexOf(best)) best = s;
  return best;
}

/**
 * The rows of `matrix --json` (or the API's `matrix()`), with each
 * requirement's title and capability from `status --json`; null when
 * specgate gave no per-scenario rows.
 */
export function traceRowsOf(matrix: unknown, home?: unknown): TraceRow[] | null {
  const scenarios = (matrix as { matrix?: { scenarios?: unknown } } | null)?.matrix?.scenarios;
  if (!Array.isArray(scenarios)) return null;
  const reqs = new Map<string, { title: string | null; capability: string | null }>();
  const listed = (home as { requirements?: unknown } | null)?.requirements;
  for (const r of Array.isArray(listed) ? listed : []) {
    const id = str((r as { id?: unknown })?.id);
    if (!id || reqs.has(id)) continue;
    reqs.set(id, {
      title: str((r as { title?: unknown }).title),
      capability: str((r as { capability?: unknown }).capability),
    });
  }
  const rows: TraceRow[] = [];
  for (const s of scenarios as Array<Record<string, unknown>>) {
    const requirement = str(s?.requirement);
    if (!requirement) continue;
    const feature = str(s.feature)?.replace(/\\/g, "/") ?? null;
    const tests = strings(s.tests);
    const code = strings(s.code);
    const gaps = Array.isArray(s.gaps)
      ? LINKS.filter((l) => (s.gaps as unknown[]).includes(l))
      : LINKS.filter((l) =>
          l === "feature" ? !feature : l === "test" ? tests.length === 0 : code.length === 0,
        );
    const w = s.waiting as { question?: unknown; change?: unknown } | null | undefined;
    const status = str(s.status) ?? "";
    const known = reqs.get(requirement);
    rows.push({
      requirement,
      title: known?.title ?? null,
      scenario: str(s.scenario),
      feature,
      tests,
      code,
      status,
      gaps,
      waiting:
        w && typeof w === "object"
          ? { question: str(w.question), change: str(w.change) }
          : status === "Needs Clarification"
            ? { question: null, change: null }
            : null,
      capability: known?.capability ?? null,
      in: [],
    });
  }
  // One status per requirement, the same on each of its rows (A4).
  const byReq = new Map<string, string[]>();
  for (const r of rows) byReq.set(r.requirement, [...(byReq.get(r.requirement) ?? []), r.status]);
  for (const r of rows) {
    r.status = statusOf(byReq.get(r.requirement)!);
    if (!r.waiting && r.status === "Needs Clarification")
      r.waiting = rows.find((o) => o.requirement === r.requirement && o.waiting)?.waiting ?? {
        question: null,
        change: null,
      };
  }
  for (const r of rows) r.in = TRACE_FILTERS.filter((f) => keeps(f, r));
  return rows;
}

/** Whether a filter keeps a row (REQ-122, A3). */
export function keeps(filter: TraceFilter, row: TraceRow): boolean {
  switch (filter) {
    case "all":
      return true;
    case "gaps":
      return row.gaps.length > 0;
    case "noTest":
      return row.gaps.includes("test");
    case "waiting":
      return row.waiting !== null;
  }
}

/** Traceability as the view shows it (REQ-121, REQ-122). */
export function traceViewOf(matrix: unknown, home?: unknown): TraceView {
  const rows = traceRowsOf(matrix, home);
  const all = rows ?? [];
  const counts = Object.fromEntries(
    TRACE_FILTERS.map((f) => [f, all.filter((r) => keeps(f, r)).length]),
  ) as Record<TraceFilter, number>;
  const scenarios = all.filter((r) => r.scenario !== null);
  return {
    available: rows !== null,
    rows: all,
    counts,
    withTest: scenarios.filter((r) => r.tests.length > 0).length,
    scenarios: scenarios.length,
  };
}

// ── "Fix": the missing test as a skeleton (REQ-123) ───────────────────────

/** A step of a scenario, its keyword as the feature writes it, upper case. */
export interface ScenarioStep {
  keyword: string;
  text: string;
}

/** A scenario of a feature file: its title, the line it starts on and its steps. */
export interface ScenarioText {
  id: string;
  title: string;
  /** 1-based: the line of `Scenario:`. */
  line: number;
  steps: ScenarioStep[];
}

const SCENARIO =
  /^\s*(?:Scenario(?: Outline| Template)?|Example|Escenario|Esquema del escenario|Ejemplo)\s*:\s*(.*)$/i;
const STEP =
  /^\s*(?:-\s*)?(Given|When|Then|And|But|Dado|Dada|Dados|Dadas|Cuando|Entonces|Y|E|Pero)\b\s*(.*)$/i;
const ENDS =
  /^\s*(?:@|Feature:|Rule:|Examples:|Scenarios:|Background:|Característica:|Regla:|Ejemplos:|Antecedentes:|#{2,}\s)/i;

/**
 * Scenario `id` of a feature file (A6): the scenario tagged `@SCN-020b`, or
 * whose title starts with its id, with its steps in order; null when the file
 * has no such scenario.
 */
export function scenarioIn(feature: string, id: string): ScenarioText | null {
  const lines = feature.replace(/\r\n?/g, "\n").split("\n");
  const tag = new RegExp(`(^|\\s)@${escape(id)}(?=\\s|$)`);
  const named = new RegExp(`(^|[\\s:—-])${escape(id)}\\b`);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (tag.test(l)) {
      for (let j = i + 1; j < lines.length; j++)
        if (SCENARIO.test(lines[j]!)) {
          start = j;
          break;
        }
      if (start >= 0) break;
    }
    if (SCENARIO.test(l) && named.test(l)) {
      start = i;
      break;
    }
  }
  if (start < 0) return null;
  const title = SCENARIO.exec(lines[start]!)![1]!.trim();
  const steps: ScenarioStep[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i]!;
    if (SCENARIO.test(l) || ENDS.test(l)) break;
    const m = STEP.exec(l);
    if (m) steps.push({ keyword: m[1]!.toUpperCase(), text: m[2]!.trim() });
  }
  return {
    id,
    title: title.replace(new RegExp(`^${escape(id)}\\s*[—:-]?\\s*`), ""),
    line: start + 1,
    steps,
  };
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** How the project writes its tests, read from one it already has (A6). */
export type TestStyle = "node-test" | "node-test-cjs" | "vitest" | "jest" | "pytest";

/** The style of a test, by its name and its text; node:test when nothing says otherwise. */
export function testStyleOf(path: string, text: string): TestStyle {
  if (/\.py$/.test(path)) return "pytest";
  if (/from\s+["']vitest["']/.test(text)) return "vitest";
  if (/require\(\s*["']node:test["']\s*\)/.test(text)) return "node-test-cjs";
  if (/from\s+["']node:test["']/.test(text)) return "node-test";
  if (/@jest\/globals|\b(describe|it|test)\s*\(/.test(text) && !/node:test/.test(text))
    return "jest";
  return "node-test";
}

const TEST_FILE = /(\.(?:test|spec)\.[cm]?[jt]sx?|_test\.py|\.py)$/;

/**
 * Where the missing test goes (A6): where the project keeps tests for that
 * module, named after the requirement — `test/pagos/REQ-020.test.ts` — with
 * the extension its tests have; a file already there is never overwritten:
 * the scenario's id is added to the name.
 */
export function testPathFor(
  row: Pick<TraceRow, "requirement" | "scenario" | "feature" | "capability">,
  tests: readonly string[],
  exists: (path: string) => boolean,
): string {
  const module =
    row.capability ?? /^features\/(?:(.+)\/)?[^/]+\.feature$/.exec(row.feature ?? "")?.[1] ?? "";
  const named = tests.filter((t) => TEST_FILE.test(t));
  // The folder the project's tests are in: the one holding this module's, else the most used.
  const inModule = module
    ? named.map((t) => t.split(`/${module}/`)[0]!).find((root, i) => root !== named[i])
    : undefined;
  const roots = named
    .map((t) => t.split("/")[0]!)
    .filter((r) => /^(tests?|spec|__tests__)$/.test(r));
  const root = inModule ?? mostUsed(roots) ?? "test";
  const ext = mostUsed(named.map((t) => TEST_FILE.exec(t)![1]!)) ?? ".test.ts";
  const dir = [root, module].filter(Boolean).join("/");
  const python = ext.endsWith(".py");
  const base = python ? `test_${snake(row.requirement)}` : row.requirement;
  const suffix = python ? ".py" : ext;
  const first = `${dir}/${base}${suffix}`;
  if (!exists(first)) return first;
  const scenario = row.scenario ?? "scenario";
  return `${dir}/${python ? `${base}_${snake(scenario)}` : `${base}-${scenario}`}${suffix}`;
}

const snake = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_");

function mostUsed(values: readonly string[]): string | undefined {
  const count = new Map<string, number>();
  for (const v of values) count.set(v, (count.get(v) ?? 0) + 1);
  let best: string | undefined;
  for (const [v, n] of count) if (best === undefined || n > count.get(best)!) best = v;
  return best;
}

/**
 * The skeleton of the missing test (A6): it names the requirement and the
 * scenario, so specgate links it; one step per GIVEN, WHEN and THEN of the
 * scenario, in the project's test style; a failing placeholder where the
 * assertions go. Written from the scenario alone: no agent, no cost.
 */
export function testSkeleton(input: {
  requirement: string;
  scenario: ScenarioText;
  feature: string;
  style: TestStyle;
}): string {
  const { requirement: req, scenario: s, feature, style } = input;
  const name = `${req} ${s.id}: ${s.title}`;
  const fail = `${s.id}: write the assertions of this scenario, then specgate apply ${req}`;
  if (style === "pytest") {
    return [
      `# ${req} ${s.id}: ${s.title}`,
      `# From ${feature}. Write the assertions, then \`specgate apply ${req}\`.`,
      "",
      "",
      `def test_${snake(req)}_${snake(s.id)}():`,
      `    """${name.replace(/"""/g, "'''")}"""`,
      ...s.steps.map((st) => `    # ${st.keyword} ${st.text}`),
      `    raise AssertionError(${JSON.stringify(fail)})`,
      "",
    ].join("\n");
  }
  const head = [
    `// ${req} ${s.id}: ${s.title}`,
    `// From ${feature}. Write the assertions, then \`specgate apply ${req}\`.`,
  ];
  const imports: Record<Exclude<TestStyle, "pytest">, string[]> = {
    "node-test": ['import test from "node:test";', 'import assert from "node:assert/strict";'],
    "node-test-cjs": [
      'const test = require("node:test");',
      'const assert = require("node:assert/strict");',
    ],
    vitest: ['import { assert, test } from "vitest";'],
    jest: [],
  };
  const failing =
    style === "jest"
      ? `throw new Error(${JSON.stringify(fail)});`
      : `assert.fail(${JSON.stringify(fail)});`;
  return [
    ...head,
    ...imports[style],
    "",
    `test(${JSON.stringify(name)}, () => {`,
    ...s.steps.map((st) => `  // ${st.keyword} ${st.text}`),
    `  ${failing}`,
    "});",
    "",
  ].join("\n");
}

/** The missing test "Fix" proposes (REQ-123): nothing written yet. */
export interface TestProposal {
  requirement: string;
  scenario: string;
  title: string;
  /** The feature file and the line its scenario starts on: the editor opens there. */
  feature: string;
  line: number;
  /** The file it would write. */
  path: string;
  /** What it would write. */
  text: string;
  steps: ScenarioStep[];
}

/**
 * What "Ask the agent" asks the project's agent (REQ-123, A11): complete the
 * skeleton of one scenario, its requirement and feature given as context
 * (`@REQ-020`, `@features/…`), at most 4,000 characters, never read as a flag.
 */
export function agentTestRequest(p: TestProposal): string {
  const head = `Complete the test ${p.path} for ${p.scenario} of @${p.requirement}, from @${p.feature}: keep its ids and its steps, and write the assertions where the skeleton fails. Change no other file. The skeleton:\n\n`;
  const room = 4000 - head.length;
  return (head + (p.text.length <= room ? p.text : p.text.slice(0, room))).trimEnd();
}

/** A new file's text, from the unified diff that adds it. */
export function addedText(diff: string): string {
  const out: string[] = [];
  let inHunk = false;
  for (const l of diff.replace(/\r\n?/g, "\n").split("\n")) {
    if (l.startsWith("@@")) {
      inHunk = true;
      continue;
    }
    if (!inHunk) continue;
    if (l.startsWith("+")) out.push(l.slice(1));
    else if (l.startsWith(" ")) out.push(l.slice(1));
  }
  return out.length ? `${out.join("\n")}\n` : "";
}

/**
 * A line diff of `after` against `before`, as a unified diff's body: `-` for
 * a line only before, `+` only after, a space for both (REQ-123: the agent's
 * test against the skeleton).
 */
export function lineDiff(
  before: string,
  after: string,
  names = { a: "skeleton", b: "agent" },
  context = 3,
): string {
  const a = before.replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n");
  const b = after.replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n");
  const n = a.length;
  const m = b.length;
  // Longest common subsequence, from the end.
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      lcs[i]![j] =
        a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
  // Each line, kept (" "), only before ("-") or only after ("+"), with its numbers.
  const ops: Array<{ op: " " | "-" | "+"; text: string; a: number; b: number }> = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) ops.push({ op: " ", text: a[i]!, a: i++, b: j++ });
    else if (i < n && (j === m || lcs[i + 1]![j]! >= lcs[i]![j + 1]!))
      ops.push({ op: "-", text: a[i]!, a: i++, b: j });
    else ops.push({ op: "+", text: b[j]!, a: i, b: j++ });
  }
  // The changed lines with three lines around them, in hunks.
  const near = ops.map((_, k) =>
    ops.slice(Math.max(0, k - context), k + context + 1).some((o) => o.op !== " "),
  );
  const out = [`--- ${names.a}`, `+++ ${names.b}`];
  for (let k = 0; k < ops.length;) {
    if (!near[k]) {
      k++;
      continue;
    }
    let end = k;
    while (end < ops.length && near[end]) end++;
    const hunk = ops.slice(k, end);
    const was = hunk.filter((o) => o.op !== "+").length;
    const is = hunk.filter((o) => o.op !== "-").length;
    out.push(`@@ -${hunk[0]!.a + 1},${was} +${hunk[0]!.b + 1},${is} @@`);
    for (const o of hunk) out.push(`${o.op}${o.text}`);
    k = end;
  }
  return `${out.join("\n")}\n`;
}
