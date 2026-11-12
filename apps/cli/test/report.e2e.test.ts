/**
 * draft-report in a real browser: Report's figures for sprich and its module
 * pagos, read from specgate's JSON through the host (REQ-131). The desktop
 * scenarios run the same bundle; the Tauri window comes with phase 3 (A12).
 */
import test from "node:test";
import assert from "node:assert/strict";
import type { SpecgateAnswer } from "@specgate-studio/core";
import { close, open, studio, type Page } from "./support.js";

const QUALITY_INIT = "specgate quality init --level strict";

/** sprich: pagos with 6 requirements, 2 Implemented, and auth with 1 (A1). */
const PAGOS = ["REQ-001", "REQ-002", "REQ-003", "REQ-004", "REQ-005", "REQ-006"];
const homeRequirements = [
  ...PAGOS.map((id, i) => ({
    id,
    title: `Pagos ${i}`,
    category: i < 2 ? "DONE" : "NEEDS_EVERYTHING",
    needs: i < 2 ? null : "its test",
  })),
  { id: "REQ-007", title: "Auth", category: "DONE", needs: null },
];
const report = {
  total: 7,
  implemented: 3,
  requirements: [
    ...PAGOS.map((id, i) => ({
      requirement: id,
      featureFile: `features/pagos/${id}.feature`,
      status: i < 2 ? "Implemented" : "Draft",
    })),
    { requirement: "REQ-007", featureFile: "features/auth/REQ-007.feature", status: "Implemented" },
  ],
  coverage: { lines: null },
};
const matrix = {
  matrix: {
    derived: true,
    written: false,
    rows: 7,
    scenarios: [
      { requirement: "REQ-001", scenario: "SCN-001", status: "Implemented", gaps: [] },
      { requirement: "REQ-002", scenario: "SCN-002", status: "Implemented", gaps: [] },
      { requirement: "REQ-003", scenario: "SCN-003", status: "Draft", gaps: ["test", "code"] },
      { requirement: "REQ-004", scenario: "SCN-004", status: "Draft", gaps: ["test", "code"] },
      { requirement: "REQ-007", scenario: "SCN-005", status: "Implemented", gaps: [] },
    ],
  },
};
const answer = (r: Record<string, unknown>): SpecgateAnswer => ({
  data: { report: { runs: 2, passed: 2, totalMs: 2_700_000, ...r } },
  findings: [],
  exitCode: 0,
});

async function openReport(page: Page) {
  await page.click('.sga[data-view="report"]');
  await page.waitForSelector('[data-testid="report-built"]');
}
const text = async (page: Page, id: string) =>
  ((await page.textContent(`[data-testid="report-${id}"]`)) ?? "").replace(/\s+/g, " ");

test("REQ-131 SCN-391: pagos is 2 of 6, on the desktop — scenarios proven, diff coverage 74 % the harness's, line coverage not measured, mutation, cost measured, time", async () => {
  const s = await studio({
    homeRequirements,
    sections: { report, matrix },
    specgate: {
      "harness report": answer({ quality: { coverage: 70, mutation: 60 } }),
      "harness report --capability pagos": answer({
        totalMs: 1_800_000,
        quality: { measured: 2, coverage: 74, mutation: 61.5 },
        measuredCost: { total: 1.23, covered: 2, uncovered: 0 },
        estimatedCost: { total: 3, covered: 2, uncovered: 0 },
        costByProfile: [
          { profile: "claude-sonnet", measured: 1.23, estimated: 3, basis: "measured" },
        ],
      }),
    },
  });
  const page = await open(s);
  try {
    await openReport(page);
    await page.selectOption('[data-testid="report-module"]', "pagos");
    await page.waitForSelector('[data-module="pagos"]');
    assert.match(await text(page, "built"), /2 of 6/);
    assert.match(await text(page, "scenarios"), /2 of 4/);
    const diff = await text(page, "diff-coverage");
    assert.match(diff, /74 %/);
    assert.match(diff, /the harness's/);
    const lines = await text(page, "line-coverage");
    assert.match(lines, /not measured/);
    assert.doesNotMatch(lines, /0 %/);
    assert.match(await text(page, "mutation"), /61\.5 %/);
    const cost = await text(page, "cost");
    assert.match(cost, /\$1\.23/);
    assert.match(cost, /measured from the agent's tokens/);
    assert.doesNotMatch(cost, /estimated/);
    assert.match(await text(page, "time"), /30 min/);
    assert.ok(
      s.calls.some((c) => c.join(" ") === "harness report --capability pagos"),
      "pagos' figures are read for pagos",
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-131 SCN-392: no mutation score yet, in the browser — not measured, with `specgate quality init --level strict`, and no 0 %", async () => {
  const s = await studio({
    homeRequirements,
    sections: { report, matrix },
    specgate: {
      "harness report": answer({ quality: { measured: 0, coverage: null, mutation: null } }),
    },
  });
  const page = await open(s);
  try {
    await openReport(page);
    const mutation = await text(page, "mutation");
    assert.match(mutation, /not measured/);
    assert.ok(mutation.includes(QUALITY_INIT), mutation);
    assert.doesNotMatch(mutation, /\b0 %/);
    assert.equal(
      await page.getAttribute('[data-testid="report-mutation"]', "data-measured"),
      "false",
    );
    // The whole project: built of the total.
    assert.match(await text(page, "built"), /3 of 7/);
  } finally {
    await close(s, page);
  }
});

test("REQ-131 SCN-397: only an estimate of the cost, in the browser — labelled estimated, from the profile claude-sonnet, no measured cost", async () => {
  const s = await studio({
    homeRequirements,
    sections: { report, matrix },
    specgate: {
      "harness report": answer({
        measuredCost: null,
        estimatedCost: { total: 0.8, covered: 2, uncovered: 0 },
        costByProfile: [
          { profile: "claude-sonnet", measured: null, estimated: 0.8, basis: "estimated" },
        ],
      }),
    },
  });
  const page = await open(s);
  try {
    await openReport(page);
    const cost = await text(page, "cost");
    assert.match(cost, /\$0\.80/);
    assert.match(cost, /estimated/);
    assert.match(cost, /from the profile claude-sonnet/);
    assert.doesNotMatch(cost, /measured from/);
    assert.equal(
      await page.getAttribute('[data-testid="report-cost"] [data-basis]', "data-basis"),
      "estimated",
    );
  } finally {
    await close(s, page);
  }
});
