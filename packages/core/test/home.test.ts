/**
 * draft-design-conformance in the core: Home's next step as data, the route
 * and the activity (REQ-173, A8, A9).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { activityOf, agentCostOf, briefModuleNames, nextStep, routeOf } from "../src/index.js";

const Q = (id: string, blocks: string[], change = "draft-pedidos") => ({ id, change, blocks });

test("REQ-173 SCN-515: status says answer — two questions of draft-pedidos, blocking REQ-031 and REQ-034", () => {
  const next = nextStep(
    { nextCommand: 'specgate answer Q1 "…" --change draft-pedidos' },
    { questions: { open: [Q("Q1", ["REQ-034"]), Q("Q2", ["REQ-031"])] } },
    ["draft-pedidos"],
  );
  assert.deepEqual(next, {
    kind: "answer",
    count: 2,
    change: "draft-pedidos",
    module: "pedidos",
    reqs: ["REQ-031", "REQ-034"],
    command: 'specgate answer Q1 "…" --change draft-pedidos',
  });
});

test("REQ-173: a draft to review when status names nothing, then what specgate status names", () => {
  assert.deepEqual(nextStep({}, { questions: { open: [] } }, ["draft-cupones"]), {
    kind: "review",
    change: "draft-cupones",
    module: "cupones",
  });
  assert.deepEqual(nextStep({ nextCommand: "specgate apply REQ-012" }, null, []), {
    kind: "apply",
    req: "REQ-012",
    command: "specgate apply REQ-012",
  });
  assert.deepEqual(nextStep({ nextCommand: "specgate archive auth-reset" }, null, []), {
    kind: "archive",
    change: "auth-reset",
    command: "specgate archive auth-reset",
  });
  assert.deepEqual(nextStep({ nextCommand: null }, null, []), { kind: "done" });
});

test("REQ-173 SCN-515: the route at Questions answered · 2 open", () => {
  const route = routeOf({
    brief: true,
    modules: 4,
    undrafted: 0,
    openQuestions: 2,
    toReview: 1,
    pending: 9,
  });
  assert.deepEqual(
    route.map((r) => `${r.step}:${r.state}${r.count === undefined ? "" : `:${r.count}`}`),
    [
      "created:done",
      "brief:done:4",
      "drafted:done",
      "answered:current:2",
      "approved:todo",
      "built:todo",
      "report:todo",
    ],
  );
});

test("REQ-173: activity from the last commits — apply, build, draft, ticket; the cost from the report", () => {
  const a = activityOf([
    { at: 4, subject: "REQ-022: delivered, the gate green" },
    { at: 3, subject: "chore: bump" },
    { at: 2, subject: "harness: built REQ-021 … REQ-023" },
    { at: 1, subject: "draft-pedidos: drafted, 2 questions" },
    { at: 0, subject: "KAN-13 open the parking change" },
  ]);
  assert.deepEqual(
    a.map((x) => x.kind),
    ["apply", "build", "draft", "ticket"],
  );
  assert.deepEqual(
    agentCostOf({
      report: { estimatedCost: { total: 4.8 }, msPerDelivered: 520_000, passed: 15, runs: 18 },
    }),
    { total: 4.8, minutes: 130, runs: 18 },
  );
  assert.equal(agentCostOf(null), null);
});

test("REQ-173: the brief's modules for the route — its front matter, else its Module sections", () => {
  assert.deepEqual(
    briefModuleNames('---\nproduct: x\nmodules: [auth, catalogo, "pagos"]\n---\n# x\n'),
    ["auth", "catalogo", "pagos"],
  );
  assert.deepEqual(briefModuleNames("# x\n\n## Module: pedidos\n\n## Module: pagos\r\n"), [
    "pedidos",
    "pagos",
  ]);
  assert.deepEqual(briefModuleNames(""), []);
});
