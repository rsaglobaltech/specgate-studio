/**
 * draft-live-polish in the core: Live as the "En vivo" board (REQ-103) and
 * SALIDA DEL AGENTE (REQ-201), folded from the harness's events. The run is a
 * real one: the events specgate 0.34.0 wrote while the studio built REQ-141
 * (`fixtures/REQ-141.jsonl`: the setup, one attempt, the gate, ~14 min, $5.20).
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  InMemoryHarnessEvents,
  foldLive,
  parseEvents,
  relativeTarget,
  shortCommand,
  type HarnessEvent,
  type LiveStage,
  type LiveStudio,
} from "../src/index.js";
import { sprichBuilds } from "./sprich-build.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** The fixture, from `dist/test/` or `test/`. */
const FIXTURE = [
  path.join(HERE, "fixtures", "REQ-141.jsonl"),
  path.join(HERE, "..", "..", "test", "fixtures", "REQ-141.jsonl"),
].find((p) => fs.existsSync(p))!;
const RUN = fs.readFileSync(FIXTURE, "utf8");
const EVENTS = parseEvents(RUN);
const T0 = EVENTS[0]!.t!;
const jsonl = (events: readonly HarnessEvent[]) =>
  events.map((e) => JSON.stringify(e)).join("\n") + "\n";
/** The run up to the first event that matches. */
const until = (match: (e: HarnessEvent) => boolean) =>
  EVENTS.slice(
    0,
    EVENTS.findIndex((e) => match(e)),
  );

const studio = (over: Partial<LiveStudio> = {}): LiveStudio => ({
  building: "REQ-141",
  queue: ["REQ-142"],
  stopping: false,
  stopped: new Set<string>(),
  // Build was pressed 0,2 s before specgate's first event (the setup).
  startedAt: { "REQ-141": T0 - 0.2 },
  estimates: { "REQ-142": 6 },
  ...over,
});
const marks = (stages: LiveStage[]) => stages.map((s) => [s.id, s.mark]);

test("REQ-103 SCN-305: REQ-141 in its first attempt of 3 — Rama creada ✓ 0,2 s, the setup ✓ 4,5 s, the agent writing, the gate and apply waiting, REQ-142 queued with its estimate", () => {
  const writing = until((e) => e.type === "gate-start" && e.stage === "validate --strict");
  const view = foldLive({ "REQ-141": jsonl(writing) }, T0 - 1, studio());
  const r = view.requirements[0]!;
  assert.equal(r.req, "REQ-141");
  assert.equal(r.state, "running");
  assert.deepEqual(marks(r.stages), [
    ["branch", "done"],
    ["setup", "done"],
    ["agent", "running"],
    ["validate", "waiting"],
    ["tests", "waiting"],
    ["architecture", "waiting"],
    ["apply", "waiting"],
  ]);
  assert.equal(r.stages[0]!.seconds, 0.2);
  assert.deepEqual(
    [r.stages[1]!.label, r.stages[1]!.seconds],
    ["npm ci --silent --no-audit --no-fund", 4.5],
  );
  const start = EVENTS.find((e) => e.type === "attempt" && e.state === "start")!;
  assert.equal(r.stages[2]!.since, start.t, "the agent's timer counts from its attempt's start");
  assert.deepEqual([r.attempt, r.maxAttempts, r.branch], [1, 3, "harness/REQ-141"]);
  assert.deepEqual(view.queue, ["REQ-142"]);
  assert.deepEqual(view.estimates, { "REQ-142": 6 });
  assert.ok(view.totals.output > 0, "the tokens so far");
  assert.equal(view.ended, null, "the elapsed time runs while it builds");
});

test("REQ-103 SCN-612: the first seconds are never empty — Rama creada running before any event, then ✓ with the setup running", () => {
  const none = foldLive({}, T0 - 1, studio()).requirements;
  assert.equal(none.length, 1, "the requirement pressed is there before specgate writes");
  assert.deepEqual(marks(none[0]!.stages)[0], ["branch", "running"]);
  assert.equal(none[0]!.stages[0]!.since, T0 - 0.2);
  assert.ok(none[0]!.stages.slice(1).every((s) => s.mark === "waiting"));

  const setup = foldLive({ "REQ-141": jsonl(EVENTS.slice(0, 1)) }, T0 - 1, studio());
  assert.deepEqual(marks(setup.requirements[0]!.stages).slice(0, 3), [
    ["branch", "done"],
    ["setup", "running"],
    ["agent", "waiting"],
  ]);
  assert.equal(setup.requirements[0]!.stages[1]!.since, T0);
});

test("REQ-103: the whole run of REQ-141 — every stage ✓ with its time, the gate's 4 passing, ~14 min and $5.20", () => {
  const view = foldLive(
    { "REQ-141": RUN },
    T0 - 1,
    studio({ building: null, queue: [], startedAt: { "REQ-141": T0 - 0.2 } }),
  );
  const r = view.requirements[0]!;
  assert.equal(r.state, "pass");
  assert.ok(
    r.stages.every((s) => s.mark === "done"),
    JSON.stringify(marks(r.stages)),
  );
  const by = Object.fromEntries(r.stages.map((s) => [s.id, s]));
  assert.equal(by.agent!.seconds, 697, "from the attempt's start to the gate's first stage");
  assert.deepEqual([by.validate!.seconds, by.architecture!.seconds], [1.2, 3.3]);
  assert.deepEqual(
    [by.tests!.label, by.tests!.seconds, by.tests!.pass, by.tests!.fail],
    ["npm test", 109.8, 4, 0],
  );
  assert.equal(by.architecture!.label, "npm run arch");
  assert.equal(r.seconds, 818.2, "about 14 minutes, from its turn to its last event");
  assert.equal(Math.round(r.usage!.cost! * 100) / 100, 5.2);
  assert.equal(view.ended, EVENTS.at(-1)!.t, "the elapsed time stops at the last event");
  assert.deepEqual(r.attempts, [{ attempt: 1, result: "pass", stage: null, seconds: 814 }]);
});

test("REQ-103 SCN-613: REQ-142's Gate: tests fails in attempt 1 — INTENTOS says where, attempt 2 of 3 starts with its stages waiting", () => {
  const t = T0 + 1000;
  const e = (x: Record<string, unknown>) => ({ req: "REQ-142", attempt: 1, ...x });
  const events = [
    e({ t, type: "attempt", state: "start" }),
    e({ t: t + 60, type: "gate-start", stage: "validate --strict" }),
    e({ t: t + 61, type: "gate", stage: "validate --strict", result: "pass", ms: 1000 }),
    e({ t: t + 61, type: "gate-start", stage: "test command: npm test" }),
    e({
      t: t + 68,
      type: "gate",
      stage: "test command: npm test",
      result: "fail",
      ms: 7000,
      pass: 3,
      fail: 1,
    }),
  ];
  const failing = foldLive(
    { "REQ-142": jsonl(events) },
    t - 1,
    studio({ building: "REQ-142", queue: [] }),
  );
  const tests = failing.requirements[0]!.stages.find((s) => s.id === "tests")!;
  assert.deepEqual([tests.mark, tests.seconds, tests.fail], ["failed", 7, 1]);

  const retry = [
    ...events,
    e({ t: t + 68, type: "attempt", state: "end", result: "fail", stage: "gate" }),
    { t: t + 69, req: "REQ-142", attempt: 2, type: "attempt", state: "start" },
  ];
  const r = foldLive({ "REQ-142": jsonl(retry) }, t - 1, studio({ building: "REQ-142", queue: [] }))
    .requirements[0]!;
  assert.deepEqual([r.attempt, r.maxAttempts], [2, 3]);
  assert.deepEqual(r.attempts, [
    { attempt: 1, result: "fail", stage: "tests", seconds: 68 },
    { attempt: 2, result: "running", stage: null, seconds: null },
  ]);
  assert.deepEqual(marks(r.stages).slice(1), [
    ["agent", "running"],
    ["validate", "waiting"],
    ["tests", "waiting"],
    ["architecture", "waiting"],
    ["apply", "waiting"],
  ]);
});

test("REQ-201 SCN-601: one line per action — read, edit +42, run ✗ 1 failing, run ✓ 3 passing, ask — with their times; no gate or message among them", () => {
  const t = T0;
  const step = (x: Record<string, unknown>) => ({
    req: "REQ-012",
    attempt: 1,
    type: "step",
    result: "ok",
    ...x,
  });
  const events = [
    { t, req: "REQ-012", attempt: 1, type: "attempt", state: "start" },
    { t: t + 1, req: "REQ-012", attempt: 1, type: "message", text: "Reading the feature" },
    step({ t: t + 2, kind: "read", tool: "Read", target: "features/auth/REQ-012.feature" }),
    step({
      t: t + 3,
      kind: "edit",
      tool: "Edit",
      target: "packages/core/test/auth/SignOut.test.ts",
      added: 42,
      removed: 0,
    }),
    step({
      t: t + 4,
      kind: "test",
      tool: "Bash",
      target: "pnpm test SignOut",
      result: "error",
      pass: 0,
      fail: 1,
    }),
    step({ t: t + 5, kind: "test", tool: "Bash", target: "pnpm test SignOut", pass: 3, fail: 0 }),
    {
      t: t + 6,
      req: "REQ-012",
      attempt: 1,
      type: "question",
      text: "¿Cerrar sesión cierra también las otras sesiones?",
    },
    { t: t + 7, req: "REQ-012", attempt: 1, type: "gate-start", stage: "validate --strict" },
  ];
  const view = foldLive({ "REQ-012": jsonl(events) }, t - 1, studio({ building: "REQ-012" }));
  assert.deepEqual(
    view.log.map((l) => [l.t - t, l.verb, l.target, l.result, l.added, l.pass, l.fail]),
    [
      [2, "read", "features/auth/REQ-012.feature", "ok", null, null, null],
      [3, "edit", "packages/core/test/auth/SignOut.test.ts", "ok", 42, null, null],
      [4, "run", "pnpm test SignOut", "error", null, 0, 1],
      [5, "run", "pnpm test SignOut", "ok", null, 3, 0],
      [6, "ask", "¿Cerrar sesión cierra también las otras sesiones?", null, null, null, null],
    ],
  );
  assert.deepEqual(
    view.output.map((l) => l.text),
    ["Reading the feature"],
    "the agent's words go to the AGENTE tab, not the log",
  );
});

test("REQ-201 SCN-616: specgate 0.34.0's run of REQ-141 — every action a line, the edits with their lines added, the runs ✓ or ✗ with no count", () => {
  const view = foldLive({ "REQ-141": RUN }, T0 - 1, studio({ building: null, queue: [] }));
  const steps = EVENTS.filter((e) => e.type === "step");
  assert.equal(view.log.length, steps.length);
  const verbs = new Map<string, number>();
  for (const l of view.log) verbs.set(l.verb, (verbs.get(l.verb) ?? 0) + 1);
  assert.deepEqual(Object.fromEntries(verbs), { run: 43, read: 22, edit: 43, write: 11 });
  const help = view.log.find(
    (l) => l.verb === "edit" && l.target === "packages/core/src/domain/help.ts" && l.added === 24,
  );
  assert.ok(help, "edit packages/core/src/domain/help.ts +24");
  const npmTest = view.log.find((l) => l.verb === "run" && l.target === "npm test")!;
  assert.deepEqual([npmTest.result, npmTest.pass, npmTest.fail], ["error", null, null]);
  const tests = view.requirements[0]!.stages.find((s) => s.id === "tests")!;
  assert.equal(tests.pass, 4, "the gate's own count");
});

test("REQ-103: the studio's start feeds Rama creada, the queue's estimates come from Build's list, and run-start's maxAttempts wins", async () => {
  const events = new InMemoryHarnessEvents();
  const s = sprichBuilds([], "claude", { events, pollMs: 5 });
  await s.builds.list();
  assert.equal((await s.builds.start("REQ-030")).ok, true);
  await s.builds.start("REQ-032");
  let live = await s.builds.live();
  const r = live.requirements.find((x) => x.req === "REQ-030")!;
  assert.deepEqual(r.stages[0]!.mark, "running", "its branch is being made");
  assert.ok(r.stages[0]!.since! > 0);
  assert.ok("REQ-032" in live.estimates);
  const t = Math.floor(Date.now() / 1000) + 1;
  s.harness.stream({ type: "run-start", t, queue: ["REQ-030"], maxAttempts: 5 });
  s.harness.stream({ type: "attempt", t, req: "REQ-030", attempt: 1, state: "start" });
  await new Promise((ok) => setTimeout(ok, 60));
  live = await s.builds.live();
  assert.equal(live.requirements.find((x) => x.req === "REQ-030")!.maxAttempts, 5);
  s.harness.finish(0, { results: [{ requirement: "REQ-030", result: "pass" }] });
  await s.builds.close();
});

test("REQ-201 SCN-603: the demo's shell lines read as what ran — the worktree's cd and D= left out, its paths relative, a chain as its first command and …; the whole of it kept", () => {
  const view = foldLive({ "REQ-141": RUN }, T0 - 1, studio({ building: null, queue: [] }));
  const runs = view.log.filter((l) => l.verb === "run");
  assert.ok(
    runs.every((l) => !l.target.includes("specgate-harness-REQ-141")),
    JSON.stringify(runs.filter((l) => l.target.includes("specgate-harness")).map((l) => l.target)),
  );
  const shown = runs.map((l) => l.target);
  assert.ok(shown.includes("cat packages/core/src/ports/SpecgatePort.ts …"));
  assert.ok(shown.includes("npm test"));
  assert.ok(shown.some((t) => /^grep -rn "REQ-141\\|REQ-142\\|REQ-143" .* …$/.test(t)));
  assert.ok(
    shown.includes(
      "cat docs/specs/changes/draft-settings/{assumptions.md,proposal.md,change.yaml,questions.md,specs/settings/spec.md} …",
    ),
    "D=<worktree>; then $D/… made relative",
  );
  const cd = runs.find((l) => l.target === "cat packages/core/src/ports/SpecgatePort.ts …")!;
  assert.match(cd.full, /^cd \/private\/var\/folders\/.*specgate-harness-REQ-141-e79ed237; cat /);
  // A file read inside the worktree, relative to it.
  assert.ok(view.log.filter((l) => l.verb !== "run").every((l) => !l.target.startsWith("/")));
});

test("REQ-201: a command as one row — the worktree's own prefixes left out, Windows paths too; a plain command as it is", () => {
  const root = "/private/var/folders/h8/x/T/specgate-harness-REQ-141-e79ed237";
  assert.equal(
    shortCommand(`cd ${root} && npm test -- settings`, "REQ-141"),
    "npm test -- settings",
  );
  assert.equal(
    shortCommand(`D=${root}; cd $D; grep -rn "REQ-141" packages | head -30`, "REQ-141"),
    'grep -rn "REQ-141" packages …',
  );
  assert.equal(
    shortCommand(`sed -n 1,40p ${root}/apps/ui/src/rpc.ts`, "REQ-141"),
    "sed -n 1,40p apps/ui/src/rpc.ts",
  );
  assert.equal(
    shortCommand(
      `cd C:\\Users\\RUNNER~1\\AppData\\Local\\Temp\\specgate-harness-REQ-141-ab12; npm test`,
      "REQ-141",
    ),
    "npm test",
  );
  assert.equal(shortCommand("npm run build", "REQ-141"), "npm run build");
  assert.equal(
    relativeTarget(`${root}/packages/core/src/index.ts`, "REQ-141"),
    "packages/core/src/index.ts",
  );
});
