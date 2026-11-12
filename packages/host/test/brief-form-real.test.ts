/**
 * The brief as a form against a real specgate 0.34 (draft-brief REQ-071,
 * REQ-074): sprich's brief with the modules `pedidos` and `pagos` and the
 * notes of the call outside both. The form's first rule of `pedidos` changed
 * and saved — every other line stays byte for byte; a rule added as markdown
 * is in the form read again; the client's text proposes a form through a fake
 * agent (never a paid one) and nothing is written until it is accepted, and
 * discarding it leaves the file as it was.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { SpecgateCli, specgateBin } from "@specgate-studio/adapter-specgate-cli";
import { NodeScratch } from "@specgate-studio/adapter-node";
import type { BriefForm, BriefFormResult, BriefFormView } from "@specgate-studio/core";
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

const BRIEF = `---
product: Sprich — orders for a small shop
surfaces: [web]
actors:
  - { name: Customer, surfaces: [web] }
modules: [pedidos, pagos]
---

# Sprich

A Customer orders online and pays in one step.

## Module: pedidos

Rules
- Orders are kept a year.

Examples
- The one where Ana orders two books.

## Module: pagos

Rules
- When the card is expired, the payment is refused.

Examples
- The one where Ana pays with an expired card.

## Notes from the call with the client

They want it before summer.
`;

/** The fake agent: adds the front matter on top of the client's text, as the prompt asks. */
const AGENT = `
import fs from "node:fs";
let prompt = "";
process.stdin.on("data", (c) => (prompt += c));
process.stdin.on("end", () => {
  const file = /Read \`([^\`]+)\`/.exec(prompt)[1];
  const text = fs.readFileSync(file, "utf8");
  fs.writeFileSync(file, "---\\nproduct: Sprich orders and returns\\nsurfaces: [web]\\nactors:\\n  - { name: Customer, surfaces: [web] }\\nmodules: [pedidos, devoluciones]\\n---\\n\\n" + text);
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

async function sprich() {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "sg-form-"));
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
  const brief = path.join(dir, "docs", "brief.md");
  fs.writeFileSync(brief, BRIEF);
  const script = path.join(parent, "fake-agent.mjs");
  fs.writeFileSync(script, AGENT);
  specgate(dir, "config", "set", "agent", `node "${script}" < {prompt_file}`);
  // specgate finds what the agent wrote, and undoes the rest, through git.
  for (const args of [
    ["add", "-A"],
    ["-c", "user.name=sprich", "-c", "user.email=sprich@example.com", "commit", "-qm", "sprich"],
  ]) {
    const g = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
    assert.equal(g.status, 0, `git ${args.join(" ")}: ${g.stderr}`);
  }
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
    brief: { specgate: cli, scratch: new NodeScratch() },
  });
  const ui = await client(host.url);
  return {
    brief,
    ui,
    close: async () => {
      ui.close();
      await host.close();
      fs.rmSync(parent, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    },
  };
}

test("REQ-071 SCN-211 SCN-212: the first rule of pedidos changed in the form — only that line changes; a rule added as markdown is in the form", async () => {
  const s = await sprich();
  try {
    const read = (await s.ui.ask<BriefFormView>("brief.form")).result!;
    const form = read.form!;
    assert.deepEqual(
      form.modules.map((m) => m.key),
      ["pedidos", "pagos"],
    );
    assert.deepEqual(form.modules[0]!.rules, ["Orders are kept a year."]);
    const changed: BriefForm = structuredClone(form);
    changed.modules[0]!.rules[0] = "Orders are cancelled until 24 h before shipping.";
    const saved = (await s.ui.ask<BriefFormResult>("brief.form.save", { form: changed })).result!;
    assert.ok(saved.ok && saved.written.includes("docs/brief.md"), JSON.stringify(saved));
    assert.equal(
      fs.readFileSync(s.brief, "utf8"),
      BRIEF.replace(
        "- Orders are kept a year.",
        "- Orders are cancelled until 24 h before shipping.",
      ),
      "every other line byte for byte, the notes of the call included",
    );
    // SCN-212: a rule added to pagos as markdown, read back in the form.
    fs.writeFileSync(
      s.brief,
      fs
        .readFileSync(s.brief, "utf8")
        .replace(
          "- When the card is expired, the payment is refused.\n",
          "- When the card is expired, the payment is refused.\n- A refund goes back to the card it was paid with.\n",
        ),
    );
    const again = (await s.ui.ask<BriefFormView>("brief.form")).result!.form!;
    assert.deepEqual(again.modules[1]!.rules, [
      "When the card is expired, the payment is refused.",
      "A refund goes back to the card it was paid with.",
    ]);
  } finally {
    await s.close();
  }
});

test("REQ-074 SCN-218 SCN-219: the client's text proposes a form — nothing written until Accept; Discard leaves the brief byte for byte", async () => {
  const s = await sprich();
  try {
    const text =
      "Call with the client.\nThe Customer cancels orders until 24 h before shipping, and returns them within 14 days.\n";
    const proposed = (await s.ui.ask<BriefFormResult>("brief.propose", { text })).result!;
    assert.ok(
      proposed.ok,
      `${JSON.stringify(proposed)} ${s.ui.notes
        .filter((n) => n.method === "command.event")
        .map((n) => JSON.stringify(n.params))
        .join("\n")}`,
    );
    const p = proposed.ok ? proposed.view.proposal! : null!;
    assert.equal(p.product, "Sprich orders and returns");
    assert.deepEqual(
      p.modules.map((m) => m.key),
      ["pedidos", "devoluciones"],
    );
    assert.equal(fs.readFileSync(s.brief, "utf8"), BRIEF, "nothing written before Accept");

    const discarded = (await s.ui.ask<BriefFormResult>("brief.discard")).result!;
    assert.ok(discarded.ok && discarded.view.proposal === null);
    assert.equal(fs.readFileSync(s.brief, "utf8"), BRIEF, "Discard: byte for byte");

    await s.ui.ask("brief.propose", { text });
    const accepted = (await s.ui.ask<BriefFormResult>("brief.accept")).result!;
    assert.ok(
      accepted.ok,
      `${JSON.stringify(accepted)} ${s.ui.notes
        .filter((n) => n.method === "command.event")
        .map((n) => JSON.stringify(n.params))
        .slice(-4)
        .join("\n")}`,
    );
    const after = fs.readFileSync(s.brief, "utf8");
    assert.match(after, /product: Sprich orders and returns/);
    assert.match(after, /modules: \[pedidos, devoluciones\]/);
    assert.match(after, /- Orders are kept a year\./, "pedidos keeps its rules");
    assert.match(after, /## Notes from the call with the client/);
  } finally {
    await s.close();
  }
});
