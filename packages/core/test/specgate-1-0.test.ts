/**
 * specgate-1-0 — the studio on specgate 1.0: each layer's approval
 * (REQ-214), the next step and the migration it names (REQ-215), and a build
 * refused with its code and its fix (REQ-216).
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  Builds,
  Commands,
  FakeHarness,
  InMemoryGit,
  approvalsOf,
  codedError,
  groupChanges,
  nextCommandOf,
  nextStep,
  type CommandEvent,
  type SpecgateAnswer,
} from "../src/index.js";
import { REPORT, ROOT, SPRICH_STATUS, sprichBuilds } from "./sprich-build.js";

type Layer = { layer: string; owner: string; approved: boolean; stale?: number; present?: boolean };

/** `change show --json` of a layered change, as specgate 1.0 answers it. */
function layered(id: string, layers: Layer[], config: Record<string, unknown> = {}) {
  const all = layers.map((l) => ({
    layer: l.layer,
    owner: l.owner,
    file: `${l.layer}.md`,
    present: l.present ?? true,
    quorum: 1,
    approvals: l.approved ? [{ layer: l.layer, by: "ana", at: "2026-11-14" }] : [],
    stale: Array.from({ length: l.stale ?? 0 }, () => ({ by: "ana", at: "2026-11-10" })),
    approved: l.approved,
  }));
  const approved = all.filter((l) => l.present).every((l) => l.approved);
  return {
    change: {
      id,
      title: `Discover: ${id}`,
      config: { specgate_change_version: 1, schema: "layered", ...config },
      deltaCount: 1,
      deltas: [],
      tasks: { total: 0, complete: 0 },
      approvals: {
        change: id,
        schema: "layered",
        required: true,
        layers: all,
        approved,
        approvedAt: approved ? "2026-11-14" : "",
        recorded: true,
      },
    },
  };
}

const PEDIDOS = {
  requirements: [
    { id: "REQ-030", title: "Cancel", category: "NEEDS_EVERYTHING", change: "draft-pedidos" },
  ],
};
const LIST = { changes: [{ id: "draft-pedidos" }] };

// ── REQ-214 ─────────────────────────────────────────────────────────────

test("REQ-214 SCN-961: discover and design approved, tasks not — the change waits for review, each layer said", () => {
  const show = layered(
    "draft-pedidos",
    [
      { layer: "discover", owner: "product", approved: true },
      { layer: "design", owner: "architect", approved: true },
      { layer: "tasks", owner: "developer", approved: false },
    ],
    { brief: "docs/brief.md", approved: "2026-11-01" },
  );
  const view = groupChanges(LIST, PEDIDOS, { "draft-pedidos": show });
  const card = view.groups.review[0]!;
  assert.equal(card.id, "draft-pedidos");
  // The stale `approved:` line no longer decides.
  assert.equal(card.approved, null);
  assert.deepEqual(card.layers, [
    { layer: "discover", owner: "product", approved: true, stale: false },
    { layer: "design", owner: "architect", approved: true, stale: false },
    { layer: "tasks", owner: "developer", approved: false, stale: false },
  ]);
});

test("REQ-214 SCN-962: a layer edited after its approval is said stale; every layer approved, the change is in progress", () => {
  const stale = layered("draft-pedidos", [
    { layer: "discover", owner: "product", approved: false, stale: 1 },
    { layer: "design", owner: "architect", approved: true },
    { layer: "tasks", owner: "developer", approved: false, present: false },
  ]);
  const card = groupChanges(LIST, PEDIDOS, { "draft-pedidos": stale }).groups.review[0]!;
  assert.deepEqual(
    card.layers.map((l) => [l.layer, l.stale]),
    [
      ["discover", true],
      ["design", false],
    ],
  );

  const all = layered("draft-pedidos", [
    { layer: "discover", owner: "product", approved: true },
    { layer: "design", owner: "architect", approved: true },
    { layer: "tasks", owner: "developer", approved: true },
  ]);
  const view = groupChanges(LIST, PEDIDOS, { "draft-pedidos": all });
  assert.equal(view.groups.review.length, 0);
  assert.equal(view.groups.progress[0]!.approved, "2026-11-14");
});

test("REQ-214: a 0.x change, or an older specgate, is still decided by the approved: line", () => {
  const old = {
    change: {
      id: "draft-pedidos",
      config: { schema: "spec-driven", brief: "docs/brief.md", approved: "2026-11-11" },
      deltas: [],
      approvals: { required: false, layers: [], approved: false, approvedAt: "" },
    },
  };
  assert.equal(approvalsOf(old), null);
  const view = groupChanges(LIST, PEDIDOS, { "draft-pedidos": old });
  assert.equal(view.groups.progress[0]!.approved, "2026-11-11");
  assert.deepEqual(view.groups.progress[0]!.layers, []);
});

test("REQ-214: Build lists a requirement of a change with a layer to approve as waiting for review", async () => {
  const shows: Record<string, unknown> = {
    "draft-pedidos": layered(
      "draft-pedidos",
      [
        { layer: "discover", owner: "product", approved: true },
        { layer: "tasks", owner: "developer", approved: false },
      ],
      { approved: "2026-11-01" },
    ),
  };
  const answers: Record<string, SpecgateAnswer> = {
    "harness report": { data: REPORT, findings: [], exitCode: 0 },
    "config list": { data: { config: { agent: "claude" } }, findings: [], exitCode: 0 },
    "change show draft-pedidos": { data: shows["draft-pedidos"], findings: [], exitCode: 0 },
  };
  const commands = new Commands({ run: async () => 0 });
  const events: CommandEvent[] = [];
  commands.onEvent((e) => events.push(e));
  const builds = new Builds({
    specgate: { call: async (args) => answers[args.join(" ")] ?? Promise.reject(new Error("no")) },
    sections: { section: async (s) => (s === "home" ? SPRICH_STATUS : LIST) },
    root: ROOT,
    git: new InMemoryGit({ [ROOT]: { branch: "main", uncommitted: [] } }),
    harness: new FakeHarness(),
    commands,
  });
  const list = await builds.list();
  assert.deepEqual(
    list.waiting.filter((w) => w.why === "review").map((w) => w.id),
    ["REQ-030", "REQ-032"],
  );
  assert.equal(
    list.ready.some((r) => r.change === "draft-pedidos"),
    false,
  );
});

// ── REQ-215 ─────────────────────────────────────────────────────────────

test("REQ-215 SCN-963: specgate 1.0's next.command is the next step; nextCommand from an older one", () => {
  const now = {
    next: { command: "specgate apply REQ-172", argv: ["apply", "REQ-172"], placeholder: false },
  };
  assert.equal(nextCommandOf(now), "specgate apply REQ-172");
  assert.deepEqual(nextStep(now, null, []), {
    kind: "apply",
    req: "REQ-172",
    command: "specgate apply REQ-172",
  });
  assert.equal(nextCommandOf({ nextCommand: "specgate apply REQ-009" }), "specgate apply REQ-009");
  assert.equal(nextCommandOf({}), null);
});

test("REQ-215 SCN-964: eleven changes written for 0.x — migrate 1.0 is the next step, before anything else", () => {
  const status = {
    next: { command: "specgate apply REQ-172" },
    migrate: {
      changes: Array.from({ length: 11 }, (_, i) => `c${i}`),
      config: false,
      command: "specgate migrate 1.0",
    },
  };
  assert.deepEqual(nextStep(status, null, ["draft-pedidos"]), {
    kind: "migrate",
    changes: 11,
    config: false,
    command: "specgate migrate 1.0",
  });
  const lanes = { migrate: { changes: [], config: true, command: "specgate migrate 1.0" } };
  assert.deepEqual(nextStep(lanes, null, []), {
    kind: "migrate",
    changes: 0,
    config: true,
    command: "specgate migrate 1.0",
  });
});

// ── REQ-216 ─────────────────────────────────────────────────────────────

test("REQ-216: specgate's refusal read as its code, its message and its fix", () => {
  assert.deepEqual(
    codedError(
      "harness_not_approved: draft-pedidos waits for tasks (developer). Fix: specgate change approve draft-pedidos --layer tasks",
    ),
    {
      code: "harness_not_approved",
      message: "draft-pedidos waits for tasks (developer).",
      fix: "specgate change approve draft-pedidos --layer tasks",
    },
  );
  assert.deepEqual(codedError("harness_run_error: Working tree is not clean."), {
    code: "harness_run_error",
    message: "Working tree is not clean.",
  });
  assert.equal(codedError("Gate stopped at: test command"), null);
  assert.equal(codedError(null), null);
});

test("REQ-216 SCN-965: REQ-030 skipped as not approved — the notice names the code and the command that approves it", async () => {
  const s = sprichBuilds();
  await s.builds.start("REQ-030");
  s.harness.finish(0, {
    schemaVersion: 1,
    results: [
      {
        requirement: "REQ-030",
        result: "skipped",
        attempts: 0,
        branch: "harness/REQ-030",
        error:
          "harness_not_approved: draft-pedidos waits for tasks (developer). Fix: specgate change approve draft-pedidos --layer tasks",
      },
    ],
  });
  await s.builds.idle();
  const ended = s.events.filter((e) => e.type === "ended").pop();
  assert.ok(ended?.type === "ended" && ended.notice);
  assert.match(ended.notice!.en.ran, /harness_not_approved: draft-pedidos waits for tasks/);
  assert.equal(ended.notice!.en.fix, "specgate change approve draft-pedidos --layer tasks");
  assert.match(ended.notice!.es.ran, /harness_not_approved/);
});
