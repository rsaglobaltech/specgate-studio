/**
 * Build and Live on specgate 0.34 (draft-build-live): each requirement's own
 * estimate from `plan --json` (REQ-101), "Stop after this requirement" asked
 * of specgate's harness as well (REQ-105), and Live folded from
 * `harness run --format jsonl` as it streams, the agent's output included
 * (REQ-103) — on fakes that record what is asked.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  Builds,
  Commands,
  FakeHarness,
  InMemoryGit,
  buildList,
  estimatesOf,
  harnessReport,
  type SpecgateAnswer,
} from "../src/index.js";
import { REPORT, ROOT, SPRICH_STATUS } from "./sprich-build.js";

const PLAN = {
  estimates: [
    {
      requirement: "REQ-030",
      steps: 6,
      time: { ms: 540_000, basis: "history", samples: 4, detail: "4 runs" },
      cost: { amount: 0.42, basis: "history", samples: 4, detail: "4 runs" },
    },
    {
      requirement: "REQ-032",
      steps: 3,
      time: { ms: null, basis: "none", samples: 0, detail: "no run recorded yet" },
      cost: null,
    },
  ],
};

function sprich() {
  const calls: string[] = [];
  const answers: Record<string, unknown> = {
    "harness report": REPORT,
    "config list": { config: { agent: "claude" } },
    plan: PLAN,
    "harness stop --after-current": {
      stop: { requested: true, run: { pid: 1, requirements: ["REQ-030"], startedAt: 0 } },
    },
  };
  const harness = new FakeHarness();
  const commands = new Commands({ run: async () => 0 });
  const started: string[] = [];
  commands.onEvent((e) => e.type === "started" && started.push(e.command));
  const builds = new Builds({
    specgate: {
      call: async (args): Promise<SpecgateAnswer> => {
        calls.push(args.join(" "));
        const data = answers[args.join(" ")];
        if (!data) throw new Error("no answer");
        return { data, findings: [], exitCode: 0 };
      },
    },
    sections: { section: async (s) => (s === "home" ? SPRICH_STATUS : { changes: [] }) },
    root: ROOT,
    git: new InMemoryGit({ [ROOT]: { branch: "main", uncommitted: [] } }),
    harness,
    commands,
  });
  return { builds, harness, calls, started };
}

test("REQ-101: each ready requirement with specgate's own estimate — its minutes, basis, samples and cost — or none", async () => {
  const e = estimatesOf(PLAN);
  assert.deepEqual(e["REQ-030"], { minutes: 9, basis: "history", samples: 4, cost: 0.42 });
  assert.deepEqual(e["REQ-032"], { minutes: null, basis: "none", samples: 0, cost: null });
  const list = await sprich().builds.list();
  assert.deepEqual(
    list.ready.map((r) => [r.id, r.estimate?.minutes ?? null, r.estimate?.basis ?? null]),
    [
      ["REQ-030", 9, "history"],
      ["REQ-032", null, "none"],
    ],
  );
  assert.equal(buildList(SPRICH_STATUS, new Set(), REPORT, {}).ready[0]!.estimate, undefined);
});

test("REQ-105 SCN-310: stop after this requirement asks specgate's harness too — `harness stop --after-current`, told as a run; nothing is ended", async () => {
  const s = sprich();
  await s.builds.start("REQ-030");
  const stop = await s.builds.stop(false);
  assert.ok(stop.ok);
  await new Promise((ok) => setTimeout(ok, 10));
  assert.ok(s.calls.includes("harness stop --after-current"));
  assert.ok(s.started.includes("specgate harness stop --after-current"));
  assert.equal(s.harness.stopped, 0, "nothing is killed");
  s.harness.finish(0, { results: [{ requirement: "REQ-030", result: "pass" }] });
  await s.builds.idle();
});

test("REQ-103: Live folds `--format jsonl` as it streams — steps and the agent's output before the events files say anything", async () => {
  const s = sprich();
  await s.builds.start("REQ-030");
  const t = Math.floor(Date.now() / 1000) + 1;
  s.harness.stream({ type: "run-start", t, queue: ["REQ-030"] });
  s.harness.stream({ type: "attempt", t, req: "REQ-030", attempt: 1, state: "start" });
  s.harness.stream({
    type: "output",
    t,
    req: "REQ-030",
    attempt: 1,
    stream: "stdout",
    text: "Reading spec.md\n",
  });
  s.harness.stream({
    type: "step",
    t: t + 2,
    req: "REQ-030",
    attempt: 1,
    kind: "edit",
    tool: "Edit",
    target: "src/orders/cancel.ts",
    result: "ok",
  });
  const live = await s.builds.live();
  const r = live.requirements.find((x) => x.req === "REQ-030");
  assert.ok(r, JSON.stringify(live));
  assert.ok(r!.steps.some((x) => x.kind === "edit" && x.label === "src/orders/cancel.ts"));
  assert.ok(live.output.some((l) => l.kind === "output" && l.text === "Reading spec.md"));
  s.harness.finish(0, { results: [{ requirement: "REQ-030", result: "pass" }] });
  await s.builds.idle();
});

test("REQ-103: a build's outcome is read from the stream's last line, `run-end`", () => {
  const stdout = [
    JSON.stringify({ type: "run-start", t: 1 }),
    JSON.stringify({
      type: "run-end",
      t: 2,
      report: { results: [{ requirement: "REQ-030", result: "question", question: "Q5?" }] },
      status: [],
    }),
    "",
  ].join("\n");
  const r = harnessReport(stdout)!;
  assert.deepEqual(
    r.results.map((x) => [x.requirement, x.result, x.question]),
    [["REQ-030", "question", "Q5?"]],
  );
  assert.equal(harnessReport("not json\n"), null);
});
