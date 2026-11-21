/**
 * The agent's suggested question (agent-placeholder REQ-232): the module of
 * the project's only open draft change, or none — never the demo's module.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { Agent, Commands, agentModuleOf, type SpecgateAnswer } from "../src/index.js";

const list = (...ids: string[]) => ({ changes: ids.map((id) => ({ id })) });

test("REQ-232 SCN-1012: one open draft, draft-pedidos — its module, pedidos", () => {
  assert.equal(agentModuleOf(list("draft-pedidos", "add-coupons", "auth-reset")), "pedidos");
});

test("REQ-232 SCN-1013: no draft, or several — no module", () => {
  assert.equal(agentModuleOf(list()), null);
  assert.equal(agentModuleOf(list("add-coupons")), null);
  assert.equal(agentModuleOf(list("draft-pedidos", "draft-pagos")), null);
  assert.equal(agentModuleOf(null), null);
  assert.equal(agentModuleOf(list("draft-")), null, "a draft with no module names none");
});

test("REQ-232: the panel's view carries the module read from the open changes, and none when they cannot be read", async () => {
  const specgate = {
    call: async (): Promise<SpecgateAnswer> => ({ data: {}, findings: [], exitCode: 0 }),
  };
  const commands = new Commands({ run: async () => 0 });
  const one = new Agent({ commands, specgate, changes: async () => list("draft-pagos") });
  assert.equal((await one.view()).module, "pagos");
  const failing = new Agent({
    commands,
    specgate,
    changes: async () => {
      throw new Error("no change list");
    },
  });
  assert.equal((await failing.view()).module, null);
  assert.equal((await new Agent({ commands, specgate }).view()).module, null);
});
