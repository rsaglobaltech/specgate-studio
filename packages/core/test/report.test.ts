/**
 * draft-report in the core: Report's figures for the project and for each
 * module, read from specgate's JSON; what specgate has not measured is not
 * measured, with the command that measures it, never 0 (REQ-131, A2, A4, A5,
 * A13, A14).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { MEASURE_COMMAND, reportOf } from "../src/index.js";

const req = (id: string, category: string, change: string | null = null) => ({
  id,
  title: id,
  category,
  change,
});

/** sprich: pagos with 6 requirements, 2 Implemented; auth with 1, Implemented. */
const status = {
  requirements: [
    req("REQ-001", "DONE"),
    req("REQ-002", "DONE"),
    req("REQ-003", "NEEDS_TEST"),
    req("REQ-004", "NEEDS_EVERYTHING"),
    req("REQ-005", "NEEDS_EVERYTHING"),
    req("REQ-006", "NEEDS_EVERYTHING"),
    req("REQ-007", "DONE"),
  ],
};
const row = (id: string, module: string, status: string) => ({
  requirement: id,
  featureFile: `features/${module}/${id}.feature`,
  status,
});
const report = {
  total: 7,
  implemented: 3,
  requirements: [
    row("REQ-001", "pagos", "Implemented"),
    row("REQ-002", "pagos", "Implemented"),
    row("REQ-003", "pagos", "Draft"),
    row("REQ-004", "pagos", "Draft"),
    row("REQ-005", "pagos", "Draft"),
    row("REQ-006", "pagos", "Draft"),
    row("REQ-007", "auth", "Implemented"),
  ],
  coverage: { lines: null },
};
const scenario = (requirement: string, s: string, status: string, gaps: string[] = []) => ({
  requirement,
  scenario: s,
  status,
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

test("REQ-131 SCN-391: pagos is 2 of 6 — scenarios proven of its total, diff coverage 74 %, line coverage not measured, cost measured, its time", () => {
  const view = reportOf({
    module: "pagos",
    status,
    report,
    matrix,
    harness: harness({
      totalMs: 1_800_000,
      quality: { measured: 2, coverage: 74, mutation: 61.5, requirements: [] },
      measuredCost: { total: 1.234, covered: 2, uncovered: 0 },
      estimatedCost: { total: 3, covered: 2, uncovered: 0 },
      costByProfile: [{ profile: "claude-sonnet", measured: 1.234, estimated: 3, basis: "measured" }],
    }),
  });
  assert.deepEqual(view.modules, ["pagos", "auth"]);
  assert.equal(view.module, "pagos");
  assert.deepEqual(view.built, { done: 2, total: 6 });
  assert.deepEqual(view.scenarios, { measured: true, value: { proven: 3, total: 5 } });
  assert.deepEqual(view.diffCoverage, { measured: true, value: 74 });
  assert.deepEqual(view.lineCoverage, { measured: false, command: MEASURE_COMMAND.quality });
  assert.deepEqual(view.mutation, { measured: true, value: 61.5 });
  assert.deepEqual(view.cost, {
    measured: true,
    value: { total: 1.23, basis: "measured", profiles: ["claude-sonnet"] },
  });
  assert.deepEqual(view.time, { measured: true, value: { ms: 1_800_000 } });
});

test("REQ-131: the whole project — every module's requirements, the project's line coverage when a run measured it", () => {
  const view = reportOf({
    module: null,
    status,
    report: { ...report, coverage: { lines: 81.2 } },
    matrix,
    harness: null,
  });
  assert.equal(view.module, null);
  assert.deepEqual(view.built, { done: 3, total: 7 });
  assert.deepEqual(view.scenarios, { measured: true, value: { proven: 4, total: 6 } });
  assert.deepEqual(view.lineCoverage, { measured: true, value: 81.2 });
});

test("REQ-131: a requirement of an open change belongs to the change's module, as Home's modules", () => {
  const view = reportOf({
    module: "cupones",
    status: { requirements: [...status.requirements, req("REQ-010", "NEEDS_EVERYTHING", "draft-cupones")] },
    report,
    matrix,
    harness: null,
  });
  assert.deepEqual(view.modules, ["pagos", "auth", "cupones"]);
  assert.deepEqual(view.built, { done: 0, total: 1 });
  assert.deepEqual(view.scenarios, { measured: true, value: { proven: 0, total: 0 } });
});

test("REQ-131 SCN-392: no quality check measures mutation — not measured, with `specgate quality init --level strict`, never 0", () => {
  const view = reportOf({
    module: null,
    status,
    report,
    matrix,
    harness: harness({ totalMs: 60_000, quality: { measured: 0, coverage: null, mutation: null } }),
  });
  assert.equal(MEASURE_COMMAND.quality, "specgate quality init --level strict");
  assert.deepEqual(view.mutation, { measured: false, command: "specgate quality init --level strict" });
  assert.deepEqual(view.diffCoverage, {
    measured: false,
    command: "specgate quality init --level strict",
  });
});

test("REQ-131 SCN-397: only an estimate of the cost — labelled estimated, from the profile claude-sonnet, no measured cost", () => {
  const view = reportOf({
    module: null,
    status,
    report,
    matrix,
    harness: harness({
      totalMs: 60_000,
      measuredCost: null,
      estimatedCost: { total: 0.8, covered: 2, uncovered: 0 },
      costByProfile: [{ profile: "claude-sonnet", measured: null, estimated: 0.8, basis: "estimated" }],
    }),
  });
  assert.deepEqual(view.cost, {
    measured: true,
    value: { total: 0.8, basis: "estimated", profiles: ["claude-sonnet"] },
  });
});

test("REQ-131: nothing specgate measured — no harness report, no matrix rows: each not measured with its command, never 0", () => {
  const view = reportOf({ module: null, status, report: null, matrix: null, harness: null });
  assert.deepEqual(view.built, { done: 3, total: 7 });
  assert.deepEqual(view.scenarios, { measured: false, command: MEASURE_COMMAND.scenarios });
  assert.deepEqual(view.diffCoverage, { measured: false, command: MEASURE_COMMAND.quality });
  assert.deepEqual(view.lineCoverage, { measured: false, command: MEASURE_COMMAND.quality });
  assert.deepEqual(view.mutation, { measured: false, command: MEASURE_COMMAND.quality });
  assert.deepEqual(view.cost, { measured: false, command: MEASURE_COMMAND.build });
  assert.deepEqual(view.time, { measured: false, command: MEASURE_COMMAND.build });
});

test("REQ-131: a harness report with no runs has no time, and a cost no profile declares is not measured", () => {
  const view = reportOf({
    module: null,
    status,
    report,
    matrix,
    harness: { report: { runs: 0, totalMs: 0, measuredCost: null, estimatedCost: null } },
  });
  assert.deepEqual(view.time, { measured: false, command: MEASURE_COMMAND.build });
  assert.deepEqual(view.cost, { measured: false, command: MEASURE_COMMAND.build });
});
