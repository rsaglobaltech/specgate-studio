/**
 * The Brief view's panel while "Draft the modules" runs (draft-flow-clarity
 * REQ-241), without a browser: each module's state from the runs started and
 * the result.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { draftSteps, moduleOfRun } from "../src/draftSteps.js";

const TODO = ["pedidos", "pagos"];
const run = (m: string) => `specgate propose --from-brief ${m} --agent 'claude -p'`;

test("REQ-241: the module a run drafts, read from its command", () => {
  assert.equal(moduleOfRun(run("pedidos")), "pedidos");
  assert.equal(moduleOfRun("specgate propose --from-brief --brief /tmp/x.md --agent claude"), null);
  assert.equal(moduleOfRun("specgate status"), null);
});

test("REQ-241 SCN-1018: pedidos drafted, then fixed on pass 1 of 2, pagos still to come", () => {
  assert.deepEqual(draftSteps(TODO, ["pedidos"], null), {
    done: 0,
    total: 2,
    rows: [
      { module: "pedidos", state: "now", pass: 0, findings: 0 },
      { module: "pagos", state: "todo", pass: 0, findings: 0 },
    ],
  });
  assert.deepEqual(draftSteps(TODO, ["pedidos", "pedidos"], null).rows[0], {
    module: "pedidos",
    state: "fixing",
    pass: 1,
    findings: 0,
  });
  const next = draftSteps(TODO, ["pedidos", "pedidos", "pagos"], null);
  assert.deepEqual(
    next.rows.map((r) => r.state),
    ["done", "now"],
  );
  assert.equal(next.done, 1);
  const end = draftSteps(TODO, ["pedidos", "pedidos", "pagos"], { drafted: ["pedidos", "pagos"] });
  assert.deepEqual(
    end.rows.map((r) => r.state),
    ["done", "done"],
  );
  assert.equal(end.done, 2);
});

test("REQ-241 SCN-1019: pedidos stopped with its finding after two fix passes, pagos never drafted", () => {
  const end = draftSteps(TODO, ["pedidos", "pedidos", "pedidos"], {
    drafted: [],
    stopped: "pedidos",
    findings: [{ severity: "error", code: "D6_unlisted_value", message: "SCN-031 states 0." }],
  });
  assert.deepEqual(end.rows, [
    { module: "pedidos", state: "stopped", pass: 2, findings: 1 },
    { module: "pagos", state: "todo", pass: 0, findings: 0 },
  ]);
  assert.equal(end.done, 0);
});
