/**
 * approve-layers against a real specgate 1.0 (REQ-217): a layered change with
 * its discover written; "Approve discover" in Changes runs `change approve
 * --layer discover --json`, writes approvals.json, and Changes says the layer
 * approved. A layer not written yet is refused with specgate's own finding.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { SpecgateCli, specgateBin } from "@specgate-studio/adapter-specgate-cli";
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

function run(dir: string, program: string, args: string[]) {
  const r = spawnSync(program, args, {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", CI: "1" },
  });
  assert.equal(r.status, 0, `${args.join(" ")}: ${r.stdout}${r.stderr}`);
  return r.stdout;
}
const specgate = (dir: string, ...args: string[]) =>
  run(dir, process.execPath, [specgateBin(), ...args]);

/** sprich with draft-pedidos: its discover and its delta written, its design not. */
function sprich() {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "sg-apr-"));
  fs.writeFileSync(path.join(parent, "project.yaml"), CONFIG);
  specgate(
    parent,
    "init",
    "--config",
    path.join(parent, "project.yaml"),
    "--out",
    parent,
    "--no-git",
    "--no-agents",
    "--no-ci",
  );
  const dir = path.join(parent, "sprich");
  // The approval is given as the person git names in the project.
  run(dir, "git", ["init", "-q"]);
  run(dir, "git", ["config", "user.name", "Ana"]);
  run(dir, "git", ["config", "user.email", "ana@sprich.test"]);
  const opened = JSON.parse(specgate(dir, "propose", "draft-pedidos", "--json")) as {
    change: { reqRange: [string, string]; created: string[] };
  };
  const req = opened.change.reqRange[0];
  const delta = opened.change.created.find((f) =>
    /specs\/.+\/spec\.md$/.test(f.replace(/\\/g, "/")),
  )!;
  fs.writeFileSync(
    path.join(dir, delta),
    `# Delta — pedidos\n\n## ADDED Requirements\n\n### Requirement: ${req} — Cancel an order\n\n` +
      `<!-- specgate:trace actor=Customer kind=business-rule -->\n\n` +
      `The system SHALL let a customer cancel an order before it is dispatched.\n\n` +
      `#### Scenario: SCN-${req.slice(4)} — A customer cancels an order not yet dispatched\n\n` +
      `- GIVEN an order not yet dispatched\n- WHEN the customer cancels it\n- THEN the order is cancelled\n`,
  );
  fs.writeFileSync(
    path.join(dir, "docs", "specs", "changes", "draft-pedidos", "discover.md"),
    "# Discover: draft-pedidos\n\n## Context\n\nCustomers cannot cancel an order.\n\n" +
      "## Acceptance criteria\n\n- AC-1: a customer cancels an order not yet dispatched.\n",
  );
  return { parent, dir };
}

test("REQ-217 SCN-971: Approve discover in Changes — approvals.json written by Ana, discover approved, the change still to review", async () => {
  const p = sprich();
  const cli = new SpecgateCli({
    program: process.execPath,
    prefix: [specgateBin()],
    projectDir: p.dir,
  });
  const host = await startHost({
    projectDir: p.dir,
    reader: cli,
    runner: new NodeProcessRunner({
      program: process.execPath,
      prefix: [specgateBin()],
      projectDir: p.dir,
    }),
    port: 0,
    changes: { specgate: cli },
  });
  const ui = await client(host.url);
  try {
    const before = (await ui.ask<any>("changes.get")).result;
    const card = before.groups.review.find((c: any) => c.id === "draft-pedidos");
    assert.ok(card, JSON.stringify(before.groups));
    assert.deepEqual(
      card.layers.map((l: any) => [l.layer, l.approved]),
      [["discover", false]],
    );

    const approved = (
      await ui.ask<any>("command.run", {
        name: "change-approve",
        change: "draft-pedidos",
        layer: "discover",
      })
    ).result;
    assert.equal(approved.exitCode, 0, JSON.stringify(approved));
    const file = "docs/specs/changes/draft-pedidos/approvals.json";
    assert.deepEqual(approved.written, [file]);
    const records = JSON.parse(fs.readFileSync(path.join(p.dir, file), "utf8"));
    assert.equal(records[0]?.layer, "discover");
    const ended = ui.notes
      .filter((n) => n.method === "command.event" && (n.params as any).type === "ended")
      .at(-1)?.params as any;
    assert.equal(ended.notice.en.tone, "ok");
    assert.match(ended.notice.en.ran, /approved the discover layer of draft-pedidos/);
    assert.match(ended.notice.es.ran, /aprobó la capa discover de draft-pedidos/);

    const after = (await ui.ask<any>("changes.get")).result;
    const now = [...after.groups.review, ...after.groups.progress].find(
      (c: any) => c.id === "draft-pedidos",
    );
    assert.deepEqual(
      now.layers.map((l: any) => [l.layer, l.approved]),
      [["discover", true]],
    );

    // REQ-217 SCN-972: a layer not written is refused with specgate's finding; nothing written.
    const refused = (
      await ui.ask<any>("command.run", {
        name: "change-approve",
        change: "draft-pedidos",
        layer: "design",
      })
    ).result;
    assert.notEqual(refused.exitCode, 0);
    assert.equal(refused.findings[0]?.code, "approve_layer_missing");
    assert.deepEqual(refused.written, []);
  } finally {
    ui.close();
    await host.close();
    fs.rmSync(p.parent, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
  }
});
