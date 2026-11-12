/**
 * draft-build-live in the core: Live shows each requirement's steps with
 * their time, the agent's output as it streams, the queue, cost and tokens
 * (REQ-103) — folded from the harness's JSON event lines (A9), so a second
 * tab folds the same.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  InMemoryHarnessEvents,
  foldLive,
  foldUsage,
  parseEvents,
  type LiveView,
} from "../src/index.js";
import { sprichBuilds } from "./sprich-build.js";

const T = 1_794_400_000;
const line = (e: object) => `${JSON.stringify(e)}\n`;

/** REQ-030 mid-build (SCN-305): two steps and the gate's validate done, its test command running. */
export const REQ030 = [
  { t: T, req: "REQ-030", attempt: 1, type: "attempt", state: "start" },
  { t: T, req: "REQ-030", attempt: 1, type: "agent", model: "claude-sonnet" },
  { t: T + 1, req: "REQ-030", attempt: 1, type: "message", text: "Reading the scenario" },
  {
    t: T + 4,
    req: "REQ-030",
    attempt: 1,
    type: "step",
    kind: "read",
    tool: "Read",
    target: "features/pedidos/REQ-030.feature",
    started: T + 2,
    ended: T + 2.4,
    result: "ok",
  },
  {
    t: T + 40,
    req: "REQ-030",
    attempt: 1,
    type: "step",
    kind: "write",
    tool: "Write",
    target: "test/cancel.test.ts",
    started: T + 5,
    ended: T + 17.25,
    result: "ok",
  },
  {
    t: T + 41,
    req: "REQ-030",
    attempt: 1,
    type: "usage",
    context: 18000,
    window: 200000,
    output: 900,
  },
  {
    t: T + 60,
    req: "REQ-030",
    attempt: 1,
    type: "usage",
    final: true,
    input: 12000,
    output: 1500,
    cacheRead: 30000,
    cacheWrite: 2000,
    cost: 0.4213,
  },
  { t: T + 61, req: "REQ-030", attempt: 1, type: "gate-start", stage: "validate --strict" },
  {
    t: T + 62,
    req: "REQ-030",
    attempt: 1,
    type: "gate",
    stage: "validate --strict",
    result: "pass",
    ms: 1200,
  },
  { t: T + 63, req: "REQ-030", attempt: 1, type: "gate-start", stage: "test command: npm test" },
];
const jsonl = (events: object[]) => events.map(line).join("");
const studio = (building: string | null, queue: string[] = []) => ({
  building,
  queue,
  stopping: false,
  stopped: new Set<string>(),
});

test("REQ-103 SCN-305: REQ-030's finished steps with their times, the gate's test command running, REQ-032 queued, the cost and tokens so far", () => {
  const view = foldLive({ "REQ-030": jsonl(REQ030) }, T, studio("REQ-030", ["REQ-032"]));
  assert.equal(view.building, "REQ-030");
  assert.deepEqual(view.queue, ["REQ-032"]);
  const r = view.requirements[0]!;
  assert.equal(r.req, "REQ-030");
  assert.equal(r.state, "running");
  assert.deepEqual(
    r.steps.map((s) => [s.kind, s.label, s.seconds, s.result]),
    [
      ["read", "features/pedidos/REQ-030.feature", 0.4, "ok"],
      ["write", "test/cancel.test.ts", 12.3, "ok"],
      ["gate", "validate --strict", 1.2, "pass"],
      ["gate", "test command: npm test", null, "running"],
    ],
  );
  assert.equal(r.steps[3]!.since, T + 63, "the running step counts from its start");
  assert.deepEqual(view.totals, {
    input: 12000,
    output: 1500,
    cacheRead: 30000,
    cacheWrite: 2000,
    cost: 0.4213,
    // No turns counted in this run's final usage (demo-findings REQ-211).
    turns: null,
  });
  // The agent's words, apart from its actions (draft-live-polish A3, REQ-201).
  assert.deepEqual(
    view.output.map((l) => l.text),
    ["Reading the scenario"],
  );
  assert.deepEqual(
    view.log.map((l) => `${l.verb} ${l.target}`),
    ["read features/pedidos/REQ-030.feature", "write test/cancel.test.ts"],
  );
});

test("REQ-103: while the agent works between steps, its current step is the agent's, counted from its last one", () => {
  const view = foldLive({ "REQ-030": jsonl(REQ030.slice(0, 5)) }, T, studio("REQ-030"));
  const running = view.requirements[0]!.steps.at(-1)!;
  assert.deepEqual([running.kind, running.result, running.seconds], ["agent", "running", null]);
  assert.equal(running.since, T + 40);
});

test("REQ-103: a requirement that ended shows how; what ran when it ended did not finish", () => {
  const failed = [
    ...REQ030,
    {
      t: T + 70,
      req: "REQ-030",
      attempt: 1,
      type: "gate",
      stage: "test command: npm test",
      result: "fail",
      ms: 7000,
    },
    { t: T + 70, req: "REQ-030", attempt: 1, type: "attempt", state: "end", result: "fail" },
  ];
  const r = foldLive({ "REQ-030": jsonl(failed) }, T, studio(null)).requirements[0]!;
  assert.equal(r.state, "fail");
  assert.deepEqual(r.steps.at(-1), {
    kind: "gate",
    label: "test command: npm test",
    seconds: 7,
    result: "fail",
    since: T + 63,
  });
});

test("REQ-103: only the run being shown counts — an older run's events are left out, every attempt of this one paid for", () => {
  const old = [
    { t: T - 900, req: "REQ-029", attempt: 1, type: "attempt", state: "start" },
    {
      t: T - 800,
      req: "REQ-029",
      attempt: 1,
      type: "usage",
      final: true,
      input: 5,
      output: 5,
      cost: 9,
    },
  ];
  const retry = [
    ...REQ030,
    { t: T + 70, req: "REQ-030", attempt: 1, type: "attempt", state: "end", result: "fail" },
    { t: T + 71, req: "REQ-030", attempt: 2, type: "attempt", state: "start" },
    {
      t: T + 80,
      req: "REQ-030",
      attempt: 2,
      type: "usage",
      final: true,
      input: 100,
      output: 10,
      cost: 0.1,
    },
  ];
  const view = foldLive({ "REQ-029": jsonl(old), "REQ-030": jsonl(retry) }, T, studio("REQ-030"));
  assert.deepEqual(
    view.requirements.map((r) => r.req),
    ["REQ-030"],
  );
  assert.equal(view.requirements[0]!.attempt, 2);
  assert.equal(view.totals.input, 12100);
  assert.equal(view.totals.cost, 0.5213);
});

test("REQ-103: a line being written, or CRLF, does not break the fold", () => {
  const text = jsonl(REQ030.slice(0, 3)).replace(/\n/g, "\r\n") + '{"t": 1794400004, "type": "mess';
  assert.equal(parseEvents(text).length, 3);
  assert.equal(foldUsage([]), null);
});

test("REQ-103 SCN-305: Build on REQ-032 while REQ-030 builds queues it; it starts when REQ-030 ends, and Live is told each time", async () => {
  const events = new InMemoryHarnessEvents();
  const views: LiveView[] = [];
  const s = sprichBuilds([], "claude", { events, onLive: (v) => views.push(v), pollMs: 5 });
  assert.equal((await s.builds.start("REQ-030")).ok, true);
  const queued = await s.builds.start("REQ-032");
  assert.deepEqual(queued, { ok: true, req: "REQ-032", queued: true });
  assert.deepEqual(s.harness.started.length, 1, "one build at a time");
  let live = await s.builds.live();
  assert.equal(live.building, "REQ-030");
  assert.deepEqual(live.queue, ["REQ-032"]);

  // The agent writes; Live is told without being asked.
  events.append("REQ-030", { attempt: 1, type: "message", text: "Writing the test" });
  await until(() => views.some((v) => v.output.some((l) => l.text === "Writing the test")));

  s.harness.finish(0, { results: [{ requirement: "REQ-030", result: "pass" }] });
  await until(() => s.harness.started.length === 2);
  assert.deepEqual(s.harness.started[1], [
    "harness",
    "run",
    "--req",
    "REQ-032",
    "--format",
    "jsonl",
  ]);
  live = await s.builds.live();
  assert.equal(live.building, "REQ-032");
  assert.deepEqual(live.queue, []);
  s.harness.finish(0, { results: [{ requirement: "REQ-032", result: "pass" }] });
  await s.builds.idle();
  assert.equal((await s.builds.live()).building, null);
  await s.builds.close();
});

test("REQ-103: a requirement already building or queued is not queued twice", async () => {
  const s = sprichBuilds([], "claude", { events: new InMemoryHarnessEvents() });
  await s.builds.start("REQ-030");
  await s.builds.start("REQ-032");
  await s.builds.start("REQ-032");
  await s.builds.start("REQ-030");
  assert.deepEqual((await s.builds.live()).queue, ["REQ-032"]);
  await s.builds.close();
});

async function until(ok: () => boolean, ms = 2_000): Promise<void> {
  const end = Date.now() + ms;
  while (!ok()) {
    if (Date.now() > end) throw new Error("not in time");
    await new Promise((r) => setTimeout(r, 5));
  }
}
