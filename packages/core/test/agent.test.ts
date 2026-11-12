/**
 * The agent panel's core (draft-workbench-v2 REQ-181 … REQ-183): the plan read
 * from `agent ask --json`, the commands on the allow-list, what "@" offers,
 * and the use case — a plan writes nothing, apply only with a plan, discard
 * writes nothing — on a fake specgate that records what it is asked.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  Agent,
  Commands,
  agentPlanOf,
  commandLine,
  fromWire,
  mentions,
  type SpecgateAnswer,
} from "../src/index.js";

const PLAN = {
  plan: {
    id: "20261112-101500-4bc1",
    request: "Cancel @REQ-031",
    mode: "spec",
    files: [
      {
        path: "docs/specs/changes/draft-pedidos/specs/pedidos/spec.md",
        change: "modify",
        why: "",
        diff: "-a\n+b\n",
      },
      { path: "features\\pedidos\\REQ-031.feature", change: "add", why: "SCN-031b", diff: "+x\n" },
    ],
    then: ["specgate draft --check pedidos"],
    read: ["docs/brief.md"],
    usage: { input: 2600, output: 500 },
  },
};

test("REQ-181 SCN-541: the plan of `agent ask --json` — M and + with the board's paths, its check, tokens and its change", () => {
  const plan = agentPlanOf(PLAN)!;
  assert.deepEqual(
    plan.files.map((f) => `${f.mark} ${f.shown}`),
    ["M changes/draft-pedidos/specs/pedidos/spec.md", "+ features/pedidos/REQ-031.feature"],
  );
  assert.deepEqual(plan.then, ["specgate draft --check pedidos"]);
  assert.equal(plan.tokens, 3100);
  assert.equal(plan.change, "draft-pedidos");
  assert.equal(agentPlanOf({ plan: null }), null);
});

test("REQ-183: `agent ask` is a read with --plan, apply a write, and neither comes over command.run", () => {
  assert.deepEqual(commandLine({ name: "agent-ask", request: "Cancel @REQ-031" }), {
    args: ["agent", "ask", "Cancel @REQ-031", "--plan"],
    write: false,
    json: true,
  });
  assert.equal(commandLine({ name: "agent-ask", request: "--agent rm" }), null, "never a flag");
  assert.equal(commandLine({ name: "agent-apply", id: "--all" }), null);
  assert.equal(commandLine({ name: "agent-apply", id: "20261112-101500-4bc1" })!.write, true);
  assert.equal(fromWire({ name: "agent-apply", id: "20261112-101500-4bc1" }), false);
});

test("REQ-183 SCN-547: @REQ-03 offers the requirements it starts, in order, with their titles — no file", () => {
  const offered = mentions(
    "REQ-03",
    [
      { id: "REQ-034", title: "Free shipping" },
      { id: "REQ-031", title: "Cancel an order" },
      { id: "REQ-025", title: "Pay by card" },
    ],
    ["docs/REQ-03.md"],
  );
  assert.deepEqual(offered, [
    { kind: "req", value: "REQ-031", title: "Cancel an order" },
    { kind: "req", value: "REQ-034", title: "Free shipping" },
  ]);
  assert.deepEqual(
    mentions("brief", [], ["docs/brief.md", "spec.md"]).map((m) => m.value),
    ["docs/brief.md"],
  );
});

test("REQ-182 SCN-544 SCN-545: a plan writes nothing; apply only for a plan; discard writes nothing", async () => {
  const calls: string[] = [];
  const specgate = {
    call: async (args: readonly string[]): Promise<SpecgateAnswer> => {
      calls.push(args.join(" "));
      if (args[0] === "config")
        return { data: { config: { agent: "claude -p" } }, findings: [], exitCode: 0 };
      if (args[1] === "ask") return { data: PLAN, findings: [], exitCode: 0 };
      return { data: { discarded: { id: args[2] } }, findings: [], exitCode: 0 };
    },
  };
  const commands = new Commands({ run: async () => 0 });
  const agent = new Agent({ commands, specgate });
  assert.equal((await agent.view()).agent, "claude");
  const asked = await agent.ask("Cancel @REQ-031");
  assert.ok(asked.ok && asked.entry.state === "plan");
  assert.deepEqual(
    calls.filter((c) => c.startsWith("agent")),
    ["agent ask Cancel @REQ-031 --plan"],
  );
  const n = asked.ok ? asked.entry.n : 0;
  const discarded = await agent.discard(n);
  assert.ok(discarded.ok && discarded.entry.state === "discarded");
  assert.equal((await agent.apply(n)).ok, false, "a discarded plan is not applied");
  assert.ok(!calls.some((c) => c.startsWith("agent apply")));
  assert.deepEqual(await agent.applied(), []);
});
