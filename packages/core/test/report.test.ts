/**
 * draft-report in the core: Report for the project and for each module, and
 * the last gate by stage, read from specgate 0.34's JSON; what specgate has
 * not measured is not measured, with the command that measures it, never 0
 * (REQ-131, REQ-132; A2, A4, A5, A8, A13, A14). The last gate is
 * fixtures/check-last-tests-failed-0.34.json: specgate 0.34.0's own
 * `check --last --json` after a gate that failed at the tests.
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { MEASURE_COMMAND, gateOf, reportOf, type ReportInput } from "../src/index.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  JSON.parse(
    fs.readFileSync(
      [
        path.join(HERE, "fixtures", name),
        path.join(HERE, "..", "..", "test", "fixtures", name),
      ].find((p) => fs.existsSync(p))!,
      "utf8",
    ),
  ) as unknown;
const TESTS_FAILED = fixture("check-last-tests-failed-0.34.json");

const req = (id: string, category: string, capability: string, needs: string | null = null) => ({
  id,
  title: `Title of ${id}`,
  category,
  needs,
  capability,
  change: null,
});

/** sprich (A1): pagos with 6 requirements, 2 Implemented; auth with 1; pedidos waiting for Q2. */
const status = {
  requirements: [
    req("REQ-001", "DONE", "pagos"),
    req("REQ-002", "DONE", "pagos"),
    req("REQ-003", "NEEDS_TEST", "pagos", "its test"),
    req("REQ-004", "NEEDS_EVERYTHING", "pagos", "a test and code"),
    req("REQ-005", "NEEDS_EVERYTHING", "pagos", "a test and code"),
    req("REQ-006", "NEEDS_EVERYTHING", "pagos", "a test and code"),
    req("REQ-007", "DONE", "auth"),
    req("REQ-031", "WAITING_FOR_ANSWER", "pedidos", "an answer"),
  ],
};
const report = { total: 8, implemented: 3, requirements: [], coverage: { lines: null } };
const scenario = (requirement: string, s: string, st: string, gaps: string[] = []) => ({
  requirement,
  scenario: s,
  status: st,
  gaps,
});
const matrix = {
  matrix: {
    scenarios: [
      scenario("REQ-001", "SCN-001", "Implemented"),
      scenario("REQ-002", "SCN-002", "Implemented"),
      scenario("REQ-002", "SCN-003", "Implemented"),
      scenario("REQ-003", "SCN-004", "Draft", ["test", "code"]),
      scenario("REQ-004", "SCN-005", "Draft", ["test", "code"]),
      scenario("REQ-007", "SCN-006", "Implemented"),
    ],
  },
};
const harness = (r: Record<string, unknown>) => ({ report: { runs: 2, passed: 2, ...r } });
const PASSED = {
  lastCheck: { ranAt: "2026-11-09T10:00:00.000Z", passed: true, stages: [] },
};
const questions = {
  questions: {
    open: [{ id: "Q2", text: "Until when can an order be cancelled?", blocks: ["REQ-031"] }],
  },
};
const input = (over: Partial<ReportInput> = {}): ReportInput => ({
  module: null,
  status,
  report,
  matrix,
  harness: null,
  lastCheck: PASSED,
  questions,
  ...over,
});

// ── REQ-131 ─────────────────────────────────────────────────────────────

test("REQ-131 SCN-391: pagos is 2 of 6 — its scenarios proven, diff coverage 74 % the harness's, line coverage not measured, cost measured at API prices, its time", () => {
  const view = reportOf(
    input({
      module: "pagos",
      harness: harness({
        quality: {
          coverage: 81,
          requirements: [
            { requirement: "REQ-001", coverage: 70 },
            { requirement: "REQ-002", coverage: 78 },
            { requirement: "REQ-007", coverage: 95 },
          ],
        },
      }),
      harnessModule: harness({
        totalMs: 1_800_000,
        quality: { measured: 2, coverage: 74, mutation: 61.5 },
        measuredCost: { total: 1.234, covered: 2, uncovered: 0 },
        estimatedCost: { total: 3, covered: 2, uncovered: 0 },
        costByProfile: [
          {
            profile: "claude-sonnet",
            attempts: 2,
            measuredAttempts: 2,
            tokens: { input: 120, output: 36_000, cacheRead: 5_000_000, cacheWrite: 120_000 },
            estimated: 3,
            measured: 1.234,
            basis: "measured",
          },
        ],
      }),
    }),
  );
  assert.equal(view.module, "pagos");
  assert.deepEqual(view.built, { done: 2, total: 6 });
  assert.deepEqual(view.scenarios, { measured: true, value: { proven: 3, total: 5 } });
  assert.deepEqual(view.diffCoverage, { measured: true, value: 74 });
  assert.equal(view.lineCoverage.measured, false);
  assert.deepEqual(view.mutation, { measured: true, value: 61.5 });
  assert.deepEqual(view.cost, {
    measured: true,
    value: {
      basis: "measured",
      total: 1.23,
      profiles: ["claude-sonnet"],
      tokens: { input: 120, output: 36_000, cacheRead: 5_000_000, cacheWrite: 120_000 },
    },
  });
  assert.deepEqual(view.time, { measured: true, value: { ms: 1_800_000 } });
  // "By module": each with its built count, its harness's diff coverage, what it waits for.
  assert.deepEqual(view.modules, [
    { name: "pagos", built: { done: 2, total: 6 }, diffCoverage: 74, waiting: 0 },
    { name: "auth", built: { done: 1, total: 1 }, diffCoverage: 95, waiting: 0 },
    { name: "pedidos", built: { done: 0, total: 1 }, diffCoverage: null, waiting: 1 },
  ]);
  // What is missing in pagos, and why.
  assert.deepEqual(
    view.missing.map((m) => `${m.id} ${m.category} ${m.needs}`),
    [
      "REQ-003 NEEDS_TEST its test",
      "REQ-004 NEEDS_EVERYTHING a test and code",
      "REQ-005 NEEDS_EVERYTHING a test and code",
      "REQ-006 NEEDS_EVERYTHING a test and code",
    ],
  );
});

test("REQ-131: the whole project — every module, the project's line coverage as specgate 0.34 reads it, a waiting requirement with its question", () => {
  const view = reportOf(
    input({
      report: {
        ...report,
        coverage: {
          lines: {
            percent: 81.4,
            covered: 814,
            total: 1000,
            tool: "lcov",
            file: "coverage/lcov.info",
            measuredAt: "2026-11-09T09:00:00.000Z",
          },
        },
      },
    }),
  );
  assert.equal(view.module, null);
  assert.deepEqual(view.built, { done: 3, total: 8 });
  assert.deepEqual(view.lineCoverage, { measured: true, value: 81.4 });
  assert.deepEqual(view.scenarios, { measured: true, value: { proven: 4, total: 6 } });
  const waiting = view.missing.find((m) => m.id === "REQ-031");
  assert.deepEqual(waiting?.question, { id: "Q2", text: "Until when can an order be cancelled?" });
});

test("REQ-131: a requirement without a capability belongs to its open change's module, then its feature's folder", () => {
  const view = reportOf(
    input({
      status: {
        requirements: [
          { id: "REQ-040", title: "", category: "NEEDS_EVERYTHING", change: "draft-pedidos" },
          { id: "REQ-041", title: "", category: "DONE", change: null },
        ],
      },
      report: {
        requirements: [{ requirement: "REQ-041", featureFile: "`features/auth/REQ-041.feature`" }],
      },
    }),
  );
  assert.deepEqual(
    view.modules.map((m) => m.name),
    ["pedidos", "auth"],
  );
});

test("REQ-131 SCN-392: no quality check measures mutation — not measured, with `specgate quality init --level strict`, never 0", () => {
  const view = reportOf(
    input({ harness: harness({ quality: { measured: 0, coverage: null, mutation: null } }) }),
  );
  assert.deepEqual(view.mutation, { measured: false, command: MEASURE_COMMAND.quality });
  assert.equal(MEASURE_COMMAND.quality, "specgate quality init --level strict");
  assert.deepEqual(view.diffCoverage, { measured: false, command: MEASURE_COMMAND.quality });
});

test("REQ-131 SCN-391: the project's line coverage not measured names specgate's own fix", () => {
  const fix =
    "Run the tests under c8 so they write coverage/lcov.info: `npx c8 --reporter=lcov --reporter=text npm test`.";
  const view = reportOf(
    input({
      reportFindings: [
        {
          severity: "info",
          code: "coverage_not_measured",
          message: "No coverage report measures this project's lines.",
          fix,
        },
      ],
    }),
  );
  assert.deepEqual(view.lineCoverage, { measured: false, command: "specgate report", fix });
});

test("REQ-131 SCN-397: only an estimate of the cost — labelled estimated, from the profile claude-sonnet, no measured cost", () => {
  const view = reportOf(
    input({
      harness: harness({
        measuredCost: null,
        estimatedCost: { total: 0.8, covered: 2, uncovered: 0 },
        costByProfile: [
          {
            profile: "claude-sonnet",
            tokens: null,
            measured: null,
            estimated: 0.8,
            basis: "estimated",
          },
        ],
      }),
    }),
  );
  assert.deepEqual(view.cost, {
    measured: true,
    value: { basis: "estimated", total: 0.8, profiles: ["claude-sonnet"], tokens: null },
  });
});

test("REQ-131: tokens counted but no price declared — the usage alone, and the key whose price would measure it (a subscription is not a charge)", () => {
  // As specgate 0.34.0 answered for the user's own two builds with Claude Code (REQ-131, REQ-141).
  const view = reportOf(
    input({
      harness: harness({
        totalMs: 1_614_557,
        estimatedCost: null,
        measuredCost: null,
        costByProfile: [
          {
            profile: "agent",
            attempts: 2,
            measuredAttempts: 2,
            tokens: { input: 268, output: 99_939, cacheRead: 16_967_498, cacheWrite: 322_960 },
            estimated: null,
            measured: null,
            basis: null,
          },
        ],
      }),
    }),
  );
  assert.deepEqual(view.cost, {
    measured: true,
    value: {
      basis: "usage",
      total: null,
      profiles: ["agent"],
      tokens: { input: 268, output: 99_939, cacheRead: 16_967_498, cacheWrite: 322_960 },
      priceKey: "profiles.agent.price_per_input_token",
    },
  });
  assert.deepEqual(view.time, { measured: true, value: { ms: 1_614_557 } });
});

test("REQ-131: nothing specgate measured — no harness report, no matrix rows, no gate: each not measured with its command, never 0", () => {
  const view = reportOf(
    input({ matrix: null, harness: null, lastCheck: { lastCheck: null }, report: null }),
  );
  for (const f of [view.scenarios, view.diffCoverage, view.lineCoverage, view.mutation])
    assert.equal(f.measured, false);
  assert.deepEqual(view.cost, { measured: false, command: MEASURE_COMMAND.build });
  assert.deepEqual(view.time, { measured: false, command: MEASURE_COMMAND.build });
  assert.deepEqual(view.scenarios, { measured: false, command: "specgate check" });
});

test("REQ-131: scenarios are proven when the last gate passed — after a failed one, none is", () => {
  const view = reportOf(input({ lastCheck: TESTS_FAILED }));
  assert.deepEqual(view.scenarios, { measured: true, value: { proven: 0, total: 6 } });
});

// ── REQ-132 ─────────────────────────────────────────────────────────────

test("REQ-132 SCN-393: the tests stage failed — specification passed, architecture not configured, tests failed with check_tests_failed and its fix, the quality check not run", () => {
  const gate = gateOf(TESTS_FAILED);
  assert.ok(gate.ran);
  if (!gate.ran) return;
  assert.equal(gate.passed, false);
  assert.equal(gate.at, "2026-11-12T19:34:45.010Z");
  const by = Object.fromEntries(gate.stages.map((s) => [s.name ?? s.stage, s]));
  assert.equal(by.validate?.result, "passed");
  assert.equal(by.validate?.command, "specgate validate --strict");
  assert.equal(by.architecture?.result, "not_configured");
  assert.equal(by.tests?.result, "failed");
  assert.equal(by.tests?.command, "npm test");
  assert.deepEqual(
    by.tests?.findings.map((f) => [f.code, f.fix]),
    [["check_tests_failed", "Make `npm test` pass, then run `specgate check` again."]],
  );
  assert.equal(by.lint?.stage, "quality");
  assert.equal(by.lint?.result, "not_run");
  assert.equal(by.ids?.result, "skipped");
  assert.equal(by.validate?.ms, 185);
  assert.equal(by.tests?.ms, 9);
});

test("REQ-132 SCN-394: no gate recorded — it says so and names `specgate check`", () => {
  const none = {
    lastCheck: null,
  };
  assert.deepEqual(gateOf(none), { ran: false, command: "specgate check" });
  assert.deepEqual(gateOf(null), { ran: false, command: "specgate check" });
  assert.deepEqual(reportOf(input({ lastCheck: none })).gate, {
    ran: false,
    command: "specgate check",
  });
});

test("REQ-132 SCN-398: the last gate after a restart is specgate's record — when it ran, its branch and commit", () => {
  const view = reportOf(input({ lastCheck: TESTS_FAILED }));
  assert.ok(view.gate.ran);
  if (!view.gate.ran) return;
  assert.equal(view.gate.at, "2026-11-12T19:34:45.010Z");
  assert.equal(view.gate.branch, "main");
  assert.match(view.gate.commit ?? "", /^[0-9a-f]{40}$/);
  assert.deepEqual(
    view.gate.stages.map((s) => s.stage),
    ["ids", "changes", "validate", "architecture", "tests", "quality"],
  );
});
