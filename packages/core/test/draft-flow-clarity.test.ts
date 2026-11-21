/**
 * draft-flow-clarity in the core: what blocks a change's approval, read from
 * `change show --json` (REQ-242), and each requirement's next step from
 * specgate status' category (REQ-243).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { blockersOf, groupChanges, nextStepOf } from "../src/index.js";

const SHOW = {
  change: {
    config: { brief: "docs/brief.md" },
    approvals: {
      required: true,
      approved: false,
      layers: [{ layer: "discover", owner: "product", present: true, approved: false }],
    },
    blockers: [
      {
        code: "D6_unlisted_value",
        message: 'SCN-031 states "0", which is not in the brief.',
        fix: "List it as an assumption.",
        target: "SCN-031",
      },
      { code: "approve_question_open", message: "Q2 is open: How long?" },
    ],
  },
};

test("REQ-242 SCN-1020: the two blockers of change show, each with its fix, on the card", () => {
  const view = groupChanges(
    { changes: [{ id: "draft-pedidos" }] },
    { requirements: [] },
    {
      "draft-pedidos": SHOW,
    },
  );
  assert.deepEqual(view.groups.review[0]!.blockers, [
    {
      code: "D6_unlisted_value",
      message: 'SCN-031 states "0", which is not in the brief.',
      fix: "List it as an assumption.",
      target: "SCN-031",
    },
    { code: "approve_question_open", message: "Q2 is open: How long?", fix: null, target: null },
  ]);
});

test("REQ-242: a specgate that does not say blockers — none, the card as before", () => {
  assert.deepEqual(blockersOf({ change: {} }), []);
  assert.deepEqual(blockersOf(null), []);
  assert.deepEqual(
    blockersOf({ change: { blockers: [{ code: "x" }] } }),
    [],
    "no message, no blocker",
  );
});

test("REQ-243 SCN-1022: Build for a requirement with no test, Apply only when its test and code are there", () => {
  assert.equal(nextStepOf("NEEDS_EVERYTHING"), "build");
  assert.equal(nextStepOf("NEEDS_TEST"), "build");
  assert.equal(nextStepOf("NEEDS_IMPLEMENTATION"), "build");
  assert.equal(nextStepOf("NEEDS_FEATURE"), "build");
  assert.equal(nextStepOf("NEEDS_STATUS_UPDATE"), "apply");
  assert.equal(nextStepOf("WAITING_FOR_ANSWER"), "answer");
  assert.equal(nextStepOf("DONE"), null);
  const view = groupChanges(
    { changes: [{ id: "draft-pedidos" }] },
    {
      requirements: [
        {
          id: "REQ-030",
          change: "draft-pedidos",
          category: "NEEDS_EVERYTHING",
          needs: "a test and code",
        },
        {
          id: "REQ-031",
          change: "draft-pedidos",
          category: "NEEDS_STATUS_UPDATE",
          needs: "its status",
        },
      ],
    },
    { "draft-pedidos": { change: { config: { brief: "docs/brief.md", approved: "2026-11-21" } } } },
  );
  const reqs = view.groups.progress[0]!.requirements;
  assert.deepEqual(
    reqs.map((r) => [r.id, r.next]),
    [
      ["REQ-030", "build"],
      ["REQ-031", "apply"],
    ],
  );
});
