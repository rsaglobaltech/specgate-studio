/**
 * The agent panel against a real specgate 0.34 (draft-workbench-v2 REQ-181,
 * REQ-182): sprich made by `specgate init`, its agent a fake one — a Node
 * script that changes spec.md, adds a feature file and says why — never a
 * paid agent. `agent ask --plan --json` answers the plan and nothing of the
 * project changes; only once applied does specgate write the files.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { SpecgateCli, specgateBin } from "@specgate-studio/adapter-specgate-cli";
import type { AgentResult } from "@specgate-studio/core";
import { NodeProcessRunner, startHost } from "../src/index.js";
import { client } from "./rpc.js";

const CONFIG = `PROJECT_NAME: Sprich
PROJECT_SLUG: sprich
PROJECT_TYPE: backend
DOMAIN: general
STACK: Node.js, TypeScript
API_STYLE: REST with DTO boundaries
TESTING: node --test
`;

/** The fake agent: reads the prompt, edits the scratch copy, leaves its reasons. */
const AGENT = `
import fs from "node:fs";
let prompt = "";
process.stdin.on("data", (c) => (prompt += c));
process.stdin.on("end", () => {
  fs.appendFileSync("spec.md", "\\n<!-- Orders are cancelled until 24 h before shipping. -->\\n");
  fs.mkdirSync("features/pedidos", { recursive: true });
  fs.writeFileSync("features/pedidos/REQ-031.feature", "Feature: Cancel an order\\n");
  fs.writeFileSync(".specgate-ask.json", JSON.stringify({
    why: { "spec.md": "States the window.", "features/pedidos/REQ-031.feature": "Its scenario." },
    then: ["specgate validate"],
    read: ["spec.md"],
  }));
  console.log(JSON.stringify({ type: "result", usage: { input_tokens: 2400, output_tokens: 700 } }));
});
`;

function specgate(dir: string, ...args: string[]) {
  const r = spawnSync(process.execPath, [specgateBin(), ...args], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", CI: "1" },
  });
  assert.equal(r.status, 0, `specgate ${args.join(" ")}: ${r.stdout}${r.stderr}`);
}

function sprich() {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "sg-agent-"));
  fs.writeFileSync(path.join(parent, "project.yaml"), CONFIG);
  specgate(
    parent,
    "init",
    "--config",
    path.join(parent, "project.yaml"),
    "--out",
    parent,
    "--no-agents",
    "--no-ci",
  );
  const dir = path.join(parent, "sprich");
  const script = path.join(parent, "fake-agent.mjs");
  fs.writeFileSync(script, AGENT);
  specgate(dir, "config", "set", "agent", `node "${script}" < {prompt_file}`);
  return { parent, dir };
}

test("REQ-181 REQ-182: a real specgate's plan from the fake agent — nothing written until applied, then specgate writes it", async () => {
  const { parent, dir } = sprich();
  const cli = new SpecgateCli({
    program: process.execPath,
    prefix: [specgateBin()],
    projectDir: dir,
  });
  const host = await startHost({
    projectDir: dir,
    reader: cli,
    runner: new NodeProcessRunner({
      program: process.execPath,
      prefix: [specgateBin()],
      projectDir: dir,
    }),
    port: 0,
    files: {
      list: async () => [],
      read: async (p) => fs.readFileSync(path.join(dir, p), "utf8"),
    },
    agent: { specgate: cli },
  });
  const ui = await client(host.url);
  const spec = path.join(dir, "spec.md");
  const feature = path.join(dir, "features", "pedidos", "REQ-031.feature");
  try {
    const before = fs.readFileSync(spec, "utf8");
    const asked = (
      await ui.ask<AgentResult>("agent.ask", {
        request: "Cancel until 24 h before shipping @spec.md",
      })
    ).result!;
    assert.ok(asked.ok, JSON.stringify(asked));
    const entry = asked.ok ? asked.entry : null!;
    assert.equal(entry.state, "plan", JSON.stringify(entry));
    assert.deepEqual(
      entry.plan!.files.map((f) => `${f.mark} ${f.shown} (${f.why})`),
      ["+ features/pedidos/REQ-031.feature (Its scenario.)", "M spec.md (States the window.)"],
    );
    assert.deepEqual(entry.plan!.then, ["specgate validate"]);
    assert.equal(entry.plan!.tokens, 3100);
    assert.equal(fs.readFileSync(spec, "utf8"), before, "nothing written by the plan");
    assert.ok(!fs.existsSync(feature));
    const command = ui.notes.find(
      (n) => n.method === "command.event" && (n.params as { type: string }).type === "started",
    );
    assert.match(
      (command!.params as { command: string }).command,
      /^specgate agent ask '.*' --plan$/,
    );

    const applied = (await ui.ask<AgentResult>("agent.apply", { n: entry.n })).result!;
    assert.ok(applied.ok && applied.entry.state === "applied", JSON.stringify(applied));
    assert.match(fs.readFileSync(spec, "utf8"), /until 24 h before shipping/);
    assert.equal(fs.readFileSync(feature, "utf8"), "Feature: Cancel an order\n");
    const kept = (await ui.ask<Array<{ files: unknown[] }>>("agent.applied")).result!;
    assert.equal(kept[0]!.files.length, 2, "the diff kept for Changes");
  } finally {
    ui.close();
    await host.close();
    fs.rmSync(parent, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});
