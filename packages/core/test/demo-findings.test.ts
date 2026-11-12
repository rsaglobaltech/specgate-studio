/**
 * demo-findings in the core: what is ready to close in Build (REQ-101),
 * "Rama creada" timed only by specgate (REQ-103), and the usage — tokens,
 * turns and the dollar figure — Live, Home and the status bar show (REQ-211).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { agentUsageOf, buildList, foldLive, type LiveStudio } from "../src/index.js";

const STATUS = {
  requirements: [
    { id: "REQ-139", title: "Done before", category: "DONE" },
    { id: "REQ-141", title: "A settings editor", category: "DONE" },
    { id: "REQ-142", title: "Each project setting", category: "NEEDS_STATUS_UPDATE" },
    { id: "REQ-143", title: "The sections", category: "NEEDS_STATUS_UPDATE" },
    { id: "REQ-131", title: "Built of the total", category: "NEEDS_EVERYTHING" },
  ],
};

test("REQ-101 SCN-631: REQ-142 and REQ-143, their tests in place, ready to close — not ready to build, not gone", () => {
  const list = buildList(STATUS, new Set(), null, { agent: "claude" });
  assert.deepEqual(
    list.toClose.map((r) => [r.id, r.title]),
    [
      ["REQ-142", "Each project setting"],
      ["REQ-143", "The sections"],
    ],
  );
  assert.deepEqual(
    list.ready.map((r) => r.id),
    ["REQ-131"],
  );
  assert.ok(!list.toClose.some((r) => r.id === "REQ-141"), "a requirement delivered is done");
});

const T = 1_794_490_868;
const studio = (over: Partial<LiveStudio> = {}): LiveStudio => ({
  building: "REQ-142",
  queue: [],
  stopping: false,
  stopped: new Set<string>(),
  // Its turn came 33 s before specgate's first event.
  startedAt: { "REQ-142": T - 33 },
  ...over,
});
const jsonl = (events: object[]) => events.map((e) => JSON.stringify(e)).join("\n") + "\n";
const SETUP = "setup: npm ci --silent --no-audit --no-fund";

test("REQ-103 SCN-634: Rama creada ✓ with no time when specgate gives none — the 33 s wait is not its own; the setup keeps its time", () => {
  const view = foldLive(
    {
      "REQ-142": jsonl([
        { t: T, req: "REQ-142", type: "gate-start", stage: SETUP },
        { t: T + 4, req: "REQ-142", type: "gate", stage: SETUP, result: "pass", ms: 4496 },
      ]),
    },
    T - 60,
    studio(),
  );
  const [branch, setup] = view.requirements[0]!.stages;
  assert.deepEqual([branch!.id, branch!.mark, branch!.seconds], ["branch", "done", null]);
  assert.deepEqual([setup!.id, setup!.seconds], ["setup", 4.5]);
});

test("REQ-103 SCN-634: an event of specgate's that times the branch gives Rama creada its time", () => {
  const view = foldLive(
    {
      "REQ-142": jsonl([
        { t: T, req: "REQ-142", type: "branch", branch: "harness/REQ-142", ms: 180 },
        { t: T + 1, req: "REQ-142", type: "gate-start", stage: SETUP },
      ]),
    },
    T - 60,
    studio(),
  );
  assert.equal(view.requirements[0]!.stages[0]!.seconds, 0.2);
});

test("REQ-211 SCN-635: Live's usage — the tokens, the turns and the dollars Claude Code reports, as the final usage gives them", () => {
  const view = foldLive(
    {
      "REQ-141": jsonl([
        { t: T, req: "REQ-141", attempt: 1, type: "attempt", state: "start" },
        // As the demo's REQ-141.jsonl ends: 120 turns, $5.20 at API prices.
        {
          t: T + 700,
          req: "REQ-141",
          attempt: 1,
          type: "usage",
          final: true,
          input: 156,
          output: 63_684,
          cacheRead: 11_578_509,
          cacheWrite: 201_046,
          cost: 5.1983738,
          turns: 120,
        },
      ]),
    },
    T - 1,
    studio({ building: null, startedAt: {} }),
  );
  assert.equal(view.totals.turns, 120);
  assert.equal(view.totals.cost, 5.1984);
  assert.equal(view.requirements[0]!.usage!.turns, 120);
});

test("REQ-211 SCN-635: Home's usage from `harness report --json` — the tokens of every profile, the measured total, else the estimated, else none", () => {
  const report = {
    report: {
      runs: 2,
      passed: 2,
      msPerDelivered: 807_279,
      estimatedCost: null,
      measuredCost: null,
      costByProfile: [
        {
          profile: "agent",
          tokens: { input: 268, output: 99_939, cacheRead: 16_967_498, cacheWrite: 322_960 },
        },
      ],
    },
  };
  assert.deepEqual(agentUsageOf(report), {
    tokens: 268 + 99_939 + 16_967_498 + 322_960,
    dollars: null,
    minutes: 27,
    runs: 2,
  });
  const measured = { report: { ...report.report, measuredCost: { total: 9.97 } } };
  assert.equal(agentUsageOf(measured)!.dollars, 9.97);
  const estimated = { report: { ...report.report, estimatedCost: { total: 4.8 } } };
  assert.equal(agentUsageOf(estimated)!.dollars, 4.8);
  assert.equal(agentUsageOf(null), null);
});
