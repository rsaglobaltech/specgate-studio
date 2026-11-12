/**
 * Traceability against a real specgate 0.34 (draft-traceability REQ-121,
 * REQ-123): sprich made by `specgate init`, with REQ-020's two scenarios and
 * a test that names SCN-020a only. The rows are specgate's per-scenario rows
 * (`matrix --json --dry-run`); "Fix" writes the skeleton only once
 * confirmed, and specgate then links it to SCN-020b. "Ask the agent" runs a
 * fake agent — never a paid one — and nothing is written before confirming.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { SpecgateCli, specgateBin } from "@specgate-studio/adapter-specgate-cli";
import type {
  FixResult,
  TraceAgentResult,
  TraceView,
  TraceWriteResult,
} from "@specgate-studio/core";
import { NodeProcessRunner, startHost, type ProjectFiles } from "../src/index.js";
import { client } from "./rpc.js";

const CONFIG = `PROJECT_NAME: Sprich
PROJECT_SLUG: sprich
PROJECT_TYPE: backend
DOMAIN: general
STACK: Node.js, TypeScript
API_STYLE: REST with DTO boundaries
TESTING: node --test
`;

const FEATURE = `Feature: See the cart

  @REQ-020 @SCN-020a
  Scenario: The cart with two lines
    Given a cart with two lines
    When the customer opens the cart
    Then the customer sees both lines and the total

  @REQ-020 @SCN-020b
  Scenario: The empty cart
    Given an empty cart
    When the customer opens the cart
    Then the customer sees that the cart is empty
`;

/** The fake agent: completes the skeleton it is asked about, in the scratch copy. */
const AGENT = `
import fs from "node:fs";
let prompt = "";
process.stdin.on("data", (c) => (prompt += c));
process.stdin.on("end", () => {
  fs.mkdirSync("test/pagos", { recursive: true });
  fs.writeFileSync("test/pagos/REQ-020.test.ts", "// REQ-020 SCN-020b\\n");
  console.log(JSON.stringify({ type: "result", usage: { input_tokens: 1200, output_tokens: 300 } }));
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
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "sg-trace-"));
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
  const at = (p: string) => path.join(dir, ...p.split("/"));
  const spec = fs.readFileSync(at("spec.md"), "utf8").replace(/\r\n/g, "\n");
  fs.writeFileSync(
    at("spec.md"),
    spec
      .replace(
        "| REQ-000 | The service reports its own health | Must | Draft |",
        "| REQ-000 | The service reports its own health | Must | Draft |\n| REQ-020 | See the cart | Must | Approved |",
      )
      .replace(
        "## 9. Non-functional",
        "### REQ-020 — See the cart\n\n<!-- specgate:trace status=Approved -->\n\nThe system MUST show the cart with its lines and its total.\n\n## 9. Non-functional",
      ),
  );
  for (const [p, text] of [
    ["features/pagos/REQ-020.feature", FEATURE],
    ["test/pagos/Cart.test.ts", '// REQ-020 SCN-020a\nimport test from "node:test";\n'],
    ["src/pagos/Cart.ts", "// REQ-020 SCN-020a SCN-020b: the cart\nexport const cart = 1;\n"],
  ] as const) {
    fs.mkdirSync(path.dirname(at(p)), { recursive: true });
    fs.writeFileSync(at(p), text);
  }
  const script = path.join(parent, "fake-agent.mjs");
  fs.writeFileSync(script, AGENT);
  specgate(dir, "config", "set", "agent", `node "${script}" < {prompt_file}`);
  const git = (...a: string[]) =>
    spawnSync("git", ["-c", "user.name=T", "-c", "user.email=t@example.com", ...a], { cwd: dir });
  git("add", "-A");
  git("commit", "-qm", "sprich");
  return { parent, dir, at };
}

/** The project's files on disk, as the host reads and writes them. */
function onDisk(dir: string): ProjectFiles {
  const at = (p: string) => path.join(dir, ...p.split("/"));
  const walk = (rel: string): string[] =>
    fs.readdirSync(at(rel || "."), { withFileTypes: true }).flatMap((e) => {
      if (e.name === ".git" || e.name === "node_modules") return [];
      const r = rel ? `${rel}/${e.name}` : e.name;
      return e.isDirectory() ? walk(r) : [r];
    });
  return {
    list: async () => walk(""),
    read: async (p) => fs.readFileSync(at(p), "utf8"),
    create: async (p) => {
      fs.mkdirSync(path.dirname(at(p)), { recursive: true });
      fs.writeFileSync(at(p), "", { flag: "wx" });
    },
    write: async (p, text) => fs.writeFileSync(at(p), text),
  };
}

async function host(dir: string) {
  const cli = new SpecgateCli({
    program: process.execPath,
    prefix: [specgateBin()],
    projectDir: dir,
  });
  return startHost({
    projectDir: dir,
    reader: cli,
    runner: new NodeProcessRunner({
      program: process.execPath,
      prefix: [specgateBin()],
      projectDir: dir,
    }),
    port: 0,
    files: onDisk(dir),
    agent: { specgate: cli },
  });
}

test("REQ-121 REQ-123: a real specgate 0.34 — two rows for REQ-020, SCN-020b a gap; Fix writes nothing until confirmed, then specgate links the test to SCN-020b", async () => {
  const { parent, dir, at } = sprich();
  const h = await host(dir);
  const ui = await client(h.url);
  try {
    const view = (await ui.ask<TraceView>("trace.get")).result!;
    assert.ok(view.available, JSON.stringify(view));
    const rows = view.rows.filter((r) => r.requirement === "REQ-020");
    assert.deepEqual(
      rows.map((r) => [r.scenario, r.feature, r.tests, r.status, r.gaps.includes("test")]),
      [
        [
          "SCN-020a",
          "features/pagos/REQ-020.feature",
          ["test/pagos/Cart.test.ts"],
          "Approved",
          false,
        ],
        ["SCN-020b", "features/pagos/REQ-020.feature", [], "Approved", true],
      ],
    );

    const fixed = (
      await ui.ask<FixResult>("trace.fix", { requirement: "REQ-020", scenario: "SCN-020b" })
    ).result!;
    assert.ok(fixed.ok, JSON.stringify(fixed));
    const p = fixed.ok ? fixed.proposal : null!;
    assert.equal(p.path, "test/pagos/REQ-020.test.ts");
    assert.equal(p.line, 10);
    assert.ok(!fs.existsSync(at(p.path)), "nothing written by Fix");

    const done = (
      await ui.ask<TraceWriteResult>("trace.confirm", {
        requirement: "REQ-020",
        scenario: "SCN-020b",
      })
    ).result!;
    assert.ok(done.ok, JSON.stringify(done));
    assert.equal(fs.readFileSync(at(p.path), "utf8"), p.text);
    const after = (await ui.ask<TraceView>("trace.get")).result!;
    const b = after.rows.find((r) => r.scenario === "SCN-020b")!;
    assert.deepEqual(b.tests, ["test/pagos/REQ-020.test.ts"], "specgate links the skeleton");
    assert.ok(!b.gaps.includes("test"));
  } finally {
    ui.close();
    await h.close();
    fs.rmSync(parent, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});

test("REQ-123: a real specgate 0.34 asked to complete the test — its plan mode is the specification, so the test is left out (edit_refused) and nothing is written", async () => {
  const { parent, dir, at } = sprich();
  const h = await host(dir);
  const ui = await client(h.url);
  try {
    const asked = (
      await ui.ask<TraceAgentResult>("trace.ask", { requirement: "REQ-020", scenario: "SCN-020b" })
    ).result!;
    assert.ok(asked.ok, JSON.stringify(asked));
    if (!asked.ok) return;
    assert.equal(asked.text, null, "no test in the plan");
    assert.ok(
      asked.findings.some((f) => f.code === "edit_refused" || f.code === "plan_empty"),
      JSON.stringify(asked.findings),
    );
    assert.ok(!fs.existsSync(at("test/pagos/REQ-020.test.ts")), "nothing written");
  } finally {
    ui.close();
    await h.close();
    fs.rmSync(parent, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});
