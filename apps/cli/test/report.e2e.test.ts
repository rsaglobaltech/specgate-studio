/**
 * draft-report in a real browser: Report for sprich and its module pagos,
 * read from specgate 0.34's JSON through the host (REQ-131, REQ-132) — the
 * last gate is specgate 0.34.0's own `check --last --json`
 * (packages/core/test/fixtures/check-last-tests-failed-0.34.json). The desktop
 * scenarios run the same bundle in the desktop app's webview (A12).
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import type { SpecgateAnswer } from "@specgate-studio/core";
import { browser, close, open, studio, type Page, type StudioOptions } from "./support.js";
import { coreFixture } from "./fixtures.js";

const TESTS_FAILED = coreFixture("check-last-tests-failed-0.34.json");
const QUALITY_INIT = "specgate quality init --level strict";

/** sprich (A1): pagos with 6 requirements, 2 Implemented, and auth with 1; each with its capability. */
const PAGOS = ["REQ-951", "REQ-952", "REQ-953", "REQ-954", "REQ-955", "REQ-956"];
const homeRequirements = [
  ...PAGOS.map((id, i) => ({
    id,
    title: `Pagos ${i}`,
    category: i < 2 ? "DONE" : "NEEDS_EVERYTHING",
    needs: i < 2 ? null : "a test and code",
    capability: "pagos",
  })),
  { id: "REQ-957", title: "Auth", category: "DONE", needs: null, capability: "auth" },
];
const matrix = {
  matrix: {
    derived: true,
    written: false,
    rows: 7,
    scenarios: [
      { requirement: "REQ-951", scenario: "SCN-951", status: "Implemented", gaps: [] },
      { requirement: "REQ-952", scenario: "SCN-952", status: "Implemented", gaps: [] },
      { requirement: "REQ-953", scenario: "SCN-953", status: "Draft", gaps: ["test", "code"] },
      { requirement: "REQ-954", scenario: "SCN-954", status: "Draft", gaps: ["test", "code"] },
      { requirement: "REQ-957", scenario: "SCN-955", status: "Implemented", gaps: [] },
    ],
  },
};
const ok = (data: unknown): SpecgateAnswer =>
  ({ data, findings: [], exitCode: 0 }) as SpecgateAnswer;
/** `report --json` with no line coverage: specgate's `coverage_not_measured` and its fix (specgate REQ-499). */
const REPORT: SpecgateAnswer = {
  data: { total: 7, implemented: 3, requirements: [], coverage: { lines: null } },
  findings: [
    {
      severity: "info",
      code: "coverage_not_measured",
      message: "No coverage report measures this project's lines.",
      fix: "Run the tests under c8 so they write coverage/lcov.info: `npx c8 --reporter=lcov --reporter=text npm test` (nyc, vitest --coverage and jest --coverage write it too).",
    },
  ],
  exitCode: 0,
};
const harness = (r: Record<string, unknown>) =>
  ok({ report: { runs: 2, passed: 2, totalMs: 2_700_000, ...r } });
const PASSED = ok({
  lastCheck: {
    ranAt: "2026-11-09T10:00:00.000Z",
    passed: true,
    branch: "main",
    commit: null,
    stages: [
      {
        stage: "validate",
        command: "specgate validate --strict",
        result: "passed",
        ms: 210,
        findings: [],
      },
      { stage: "tests", command: "npm test", result: "passed", ms: 41_000, findings: [] },
    ],
  },
});
const NONE: SpecgateAnswer = {
  data: { lastCheck: null },
  findings: [
    {
      severity: "info",
      code: "last_check_none",
      message: "No gate result is kept for this project: no check has run here yet.",
      fix: "specgate check",
    },
  ],
  exitCode: 0,
};

function sprich(over: NonNullable<StudioOptions["specgate"]> = {}): StudioOptions {
  return {
    rows: homeRequirements.length,
    homeRequirements: homeRequirements as never,
    sections: { matrix },
    specgate: {
      report: REPORT,
      "harness report": harness({ quality: { coverage: 70, mutation: 60 } }),
      "check --last": PASSED,
      ...over,
    },
  };
}

async function openReport(page: Page) {
  await page.click('.sga[data-view="report"]');
  await page.waitForSelector('[data-testid="report-built"]');
}
const text = async (page: Page, id: string) =>
  ((await page.textContent(`[data-testid="report-${id}"]`)) ?? "").replace(/\s+/g, " ").trim();

// ── REQ-131 ─────────────────────────────────────────────────────────────

test("REQ-131 SCN-391: pagos is 2 of 6, on the desktop — scenarios proven, diff coverage 74 % the harness's, line coverage not measured, mutation, cost measured, time", async () => {
  const s = await studio(
    sprich({
      "harness report --capability pagos": harness({
        totalMs: 1_800_000,
        quality: { measured: 2, coverage: 74, mutation: 61.5 },
        measuredCost: { total: 1.23, covered: 2, uncovered: 0 },
        estimatedCost: { total: 3, covered: 2, uncovered: 0 },
        costByProfile: [
          {
            profile: "claude-sonnet",
            tokens: { input: 120, output: 36_000, cacheRead: 5_000_000, cacheWrite: 120_000 },
            measured: 1.23,
            estimated: 3,
            basis: "measured",
          },
        ],
      }),
    }),
  );
  const page = await open(s);
  try {
    await openReport(page);
    // pagos chosen under "By module".
    await page.click('[data-module-row="pagos"]');
    await page.waitForSelector('.report[data-module="pagos"]');
    assert.match(await text(page, "built"), /^Built\s*2 of 6$/);
    assert.match(await text(page, "scenarios"), /2 of 4/);
    const diff = await text(page, "diff-coverage");
    assert.match(diff, /74 %/);
    assert.match(diff, /the harness's/);
    const lines = await text(page, "line-coverage");
    assert.match(lines, /the project's lines: not measured/);
    assert.match(lines, /npx c8/, "specgate's fix for it");
    assert.doesNotMatch(lines, /\b0 %/);
    assert.match(await text(page, "mutation"), /61\.5 %/);
    const cost = await text(page, "cost");
    assert.match(cost, /≈ \$1\.23/);
    assert.match(cost, /measured from the agent's tokens · ≈ API price/);
    assert.match(cost, /from the profile claude-sonnet/);
    assert.match(cost, /usage: 5\.2M tokens/);
    assert.doesNotMatch(cost, /estimated/);
    assert.match(await text(page, "time"), /30 min/);
    assert.ok(
      s.calls.some((c) => c.join(" ") === "harness report --capability pagos"),
      "pagos' figures are read for pagos",
    );
    // What is missing in pagos, and why.
    assert.deepEqual(
      await page.$$eval('[data-testid="report-missing"] .rmiss', (els) =>
        els.map((e) => e.getAttribute("data-req")),
      ),
      ["REQ-953", "REQ-954", "REQ-955", "REQ-956"],
    );
    // Back to the whole project.
    await page.click('[data-testid="report-module-chosen"]');
    await page.waitForSelector('.report[data-module=""]');
    assert.match(await text(page, "built"), /^Built\s*3 of 7/);
  } finally {
    await close(s, page);
  }
});

test("REQ-131 SCN-392: no mutation score yet, in the browser — not measured, with `specgate quality init --level strict`, and no 0 %", async () => {
  const s = await studio(
    sprich({
      "harness report": harness({ quality: { measured: 0, coverage: null, mutation: null } }),
    }),
  );
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
    // The whole project: built of the total, every module under "By module".
    assert.match(await text(page, "built"), /^Built\s*3 of 7/);
    assert.deepEqual(
      await page.$$eval("[data-module-row]", (els) =>
        els.map(
          (e) =>
            `${e.getAttribute("data-module-row")} ${e.querySelector(".rmod-says")?.textContent}`,
        ),
      ),
      ["pagos 2/6", "auth 1/1"],
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-131 SCN-397: only an estimate of the cost, in the browser — labelled estimated, from the profile claude-sonnet, no measured cost", async () => {
  const s = await studio(
    sprich({
      "harness report": harness({
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
  const page = await open(s);
  try {
    await openReport(page);
    const cost = await text(page, "cost");
    assert.match(cost, /\$0\.80/);
    assert.match(cost, /estimated/);
    assert.match(cost, /from the profile claude-sonnet/);
    assert.doesNotMatch(cost, /measured from|≈/);
    assert.equal(
      await page.getAttribute('[data-testid="report-cost"] [data-basis]', "data-basis"),
      "estimated",
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-131: on a subscription no price is declared — Report shows the usage in tokens and how to price it, never a charge (in Spanish)", async () => {
  // As specgate 0.34.0 answered for the user's own builds of REQ-131 and REQ-141 with Claude Code.
  const s = await studio(
    sprich({
      "harness report": harness({
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
  const page = await open(s, { lang: "es" });
  try {
    await openReport(page);
    const cost = await text(page, "cost");
    assert.match(cost, /17,4 M tokens/);
    assert.match(cost, /uso, sin precio declarado: no es un cargo/);
    assert.match(cost, /specgate config set profiles\.agent\.price_per_input_token <price>/);
    assert.doesNotMatch(cost, /\$/);
    assert.match(await text(page, "time"), /27 min/);
  } finally {
    await close(s, page);
  }
});

// ── REQ-132 ─────────────────────────────────────────────────────────────

test("REQ-132 SCN-393: the tests stage failed, on the desktop — specification passed, architecture not configured, tests failed with check_tests_failed and its fix, the quality check not run", async () => {
  const s = await studio(sprich({ "check --last": ok(TESTS_FAILED) }));
  const page = await open(s);
  try {
    await openReport(page);
    await page.waitForSelector('[data-testid="report-gate"][data-ran="true"]');
    const stage = (name: string) => `[data-testid="report-gate"] .rstage[data-stage="${name}"]`;
    assert.equal(await page.getAttribute('[data-testid="report-gate"]', "data-passed"), "false");
    assert.equal(await page.getAttribute(stage("validate"), "data-result"), "passed");
    assert.match((await page.textContent(stage("validate"))) ?? "", /Specification\s*passed/);
    assert.equal(await page.getAttribute(stage("architecture"), "data-result"), "not_configured");
    assert.match((await page.textContent(stage("architecture"))) ?? "", /not configured/);
    assert.equal(await page.getAttribute(stage("tests"), "data-result"), "failed");
    assert.equal(
      await page.getAttribute(`${stage("tests")} .rfinding`, "data-code"),
      "check_tests_failed",
    );
    assert.equal(
      await page.textContent(`${stage("tests")} .rfix-text`),
      "Make `npm test` pass, then run `specgate check` again.",
    );
    assert.equal(await page.getAttribute(stage("quality"), "data-result"), "not_run");
    assert.match((await page.textContent(stage("quality"))) ?? "", /Quality · lint\s*not run/);
    // Read from what specgate recorded: no gate is run to show it.
    assert.deepEqual(s.runs, []);
  } finally {
    await close(s, page);
  }
});

test("REQ-132 SCN-394: no gate recorded yet, in the browser — it says so, with `specgate check` beside a Check button", async () => {
  const s = await studio(sprich({ "check --last": NONE }));
  const page = await open(s);
  try {
    await openReport(page);
    await page.waitForSelector('[data-testid="report-gate"][data-ran="false"]');
    const gate = await text(page, "gate");
    assert.match(gate, /No gate has run yet for this project\./);
    assert.match(gate, /specgate check/);
    assert.equal(await page.textContent('[data-testid="report-check"]'), "Check now");
    // Scenarios proven need a gate: not measured, with `specgate check`.
    assert.match(await text(page, "scenarios"), /not measured.*specgate check/);
    // The button runs the gate.
    await page.click('[data-testid="report-check"]');
    await page.waitForFunction(() => document.querySelector(".notice"));
    assert.ok(
      s.runs.some((r) => r[0] === "check"),
      JSON.stringify(s.runs),
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-132 SCN-398: the last gate after a restart, on the desktop — that gate, stage by stage, with when it ran, and no gate run to show it", async () => {
  // The first studio is closed: the app restarted. specgate kept the gate in the git folder.
  const first = await studio(sprich({ "check --last": ok(TESTS_FAILED) }));
  await close(first);
  const s = await studio(sprich({ "check --last": ok(TESTS_FAILED) }));
  const page = await open(s);
  try {
    await openReport(page);
    await page.waitForSelector('[data-testid="report-gate"][data-ran="true"]');
    assert.equal(await page.getAttribute(".rgate-when", "data-at"), "2026-11-12T19:34:45.010Z");
    assert.match((await page.textContent(".rgate-when")) ?? "", /last run Nov 12, 2026.*· main/);
    assert.deepEqual(
      await page.$$eval('[data-testid="report-gate"] .rstage', (els) =>
        els.map((e) => `${e.getAttribute("data-stage")}:${e.getAttribute("data-result")}`),
      ),
      [
        "ids:skipped",
        "changes:skipped",
        "validate:passed",
        "architecture:not_configured",
        "tests:failed",
        "quality:not_run",
      ],
    );
    assert.deepEqual(s.runs, [], "no gate run");
    assert.ok(s.calls.some((c) => c.join(" ") === "check --last"));
    assert.ok(!s.calls.some((c) => c[0] === "check" && c[1] !== "--last"));
  } finally {
    await close(s, page);
  }
});

// ── REQ-133 ─────────────────────────────────────────────────────────────

/** pagos as SCN-391 has it: 2 of 6, the harness's diff coverage 74 %. */
const PAGOS_74 = {
  "harness report --capability pagos": harness({
    totalMs: 1_800_000,
    quality: { measured: 2, coverage: 74, mutation: 61.5 },
  }),
};

test("REQ-133 SCN-395: Download on the desktop, the folder Downloads chosen — one file sprich-report-pagos.html, opening offline with pagos 2 of 6 and coverage 74 %, the notice naming it", async () => {
  const s = await studio(sprich(PAGOS_74));
  const page = await open(s);
  // The desktop app's webview, and its system save dialog: the Developer chooses Downloads.
  await page.evaluate(() => {
    (window as never as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    const w = window as never as {
      showSaveFilePicker: (o: { suggestedName: string }) => Promise<unknown>;
      __saved: Array<{ folder: string; name: string; text: string }>;
    };
    w.__saved = [];
    w.showSaveFilePicker = async (o) => ({
      name: o.suggestedName,
      createWritable: async () => {
        let text = "";
        return {
          write: async (b: Blob | string) => {
            text += typeof b === "string" ? b : await b.text();
          },
          close: async () => {
            w.__saved.push({ folder: "Downloads", name: o.suggestedName, text });
          },
        };
      },
    });
  });
  try {
    await openReport(page);
    await page.click('[data-module-row="pagos"]');
    await page.waitForSelector('.report[data-module="pagos"]');
    await page.click('[data-testid="report-download"]');
    await page.waitForSelector('.notice[data-tone="ok"]');
    const saved = await page.evaluate(
      () =>
        (window as never as { __saved: Array<{ folder: string; name: string; text: string }> })
          .__saved,
    );
    assert.equal(saved.length, 1, "one file");
    assert.equal(saved[0]!.folder, "Downloads");
    assert.equal(saved[0]!.name, "sprich-report-pagos.html");
    const html = saved[0]!.text;
    // One self-contained page: its styles inside, no script, no address to ask.
    assert.match(html, /^<!doctype html>/i);
    assert.match(html, /<style>/);
    assert.doesNotMatch(html, /<script|<link|<img|<iframe|https?:\/\/|url\(|@import|src=/i);
    // It opens offline: nothing is requested, and it shows pagos 2 of 6 and coverage 74 %.
    const offline = await browser.newPage();
    const asked: string[] = [];
    await offline.route("**/*", (r) => (asked.push(r.request().url()), r.abort()));
    await offline.setContent(html);
    const shown = ((await offline.textContent("body")) ?? "").replace(/\s+/g, " ");
    assert.match(shown, /pagos/);
    assert.match(shown, /Built 2 of 6/);
    assert.match(shown, /74 %/);
    assert.deepEqual(asked, []);
    await offline.close();
    // The notice names the file; the studio wrote nothing in sprich, ran nothing.
    const notice = ((await page.textContent('.notice[data-tone="ok"]')) ?? "").replace(/\s+/g, " ");
    assert.match(notice, /sprich-report-pagos\.html/);
    assert.deepEqual(s.writes, []);
    assert.deepEqual(s.runs, []);
  } finally {
    await close(s, page);
  }
});

test("REQ-133: Download in the browser — a browser download of sprich-report.html, the whole project", async () => {
  const s = await studio(sprich());
  const page = await open(s);
  try {
    await openReport(page);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click('[data-testid="report-download"]'),
    ]);
    assert.equal(download.suggestedFilename(), "sprich-report.html");
    const file = await download.path();
    const html = fs.readFileSync(file!, "utf8");
    assert.match(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "), /Built 3 of 7/);
    assert.doesNotMatch(html, /<script|https?:\/\//i);
    await page.waitForSelector('.notice[data-tone="ok"]');
    assert.match((await page.textContent('.notice[data-tone="ok"]')) ?? "", /sprich-report\.html/);
    assert.deepEqual(s.writes, []);
  } finally {
    await close(s, page);
  }
});

test("REQ-133 SCN-396: Print to PDF in the browser — the print dialog opens on the report alone, without the activity bar, the panels or the status bar; nothing written", async () => {
  const s = await studio(sprich());
  const page = await open(s);
  await page.evaluate(() => {
    const w = window as never as { print: () => void; __printed: number };
    w.__printed = 0;
    w.print = () => {
      w.__printed++;
    };
  });
  try {
    await openReport(page);
    await page.click('[data-testid="report-print"]');
    assert.equal(
      await page.evaluate(() => (window as never as { __printed: number }).__printed),
      1,
    );
    // As the print dialog lays it out.
    await page.emulateMedia({ media: "print" });
    const shown = await page.evaluate(() =>
      [".activity", ".menubar", ".panel", ".status", ".agent", ".report", ".ractions"].map(
        (sel) => {
          const el = document.querySelector(sel);
          return `${sel}:${el ? getComputedStyle(el).display !== "none" && (el as HTMLElement).offsetParent !== null : "absent"}`;
        },
      ),
    );
    assert.deepEqual(shown, [
      ".activity:false",
      ".menubar:false",
      ".panel:false",
      ".status:false",
      ".agent:false",
      ".report:true",
      ".ractions:false",
    ]);
    await page.emulateMedia({ media: "screen" });
    assert.deepEqual(s.writes, []);
    assert.deepEqual(s.runs, []);
  } finally {
    await close(s, page);
  }
});
