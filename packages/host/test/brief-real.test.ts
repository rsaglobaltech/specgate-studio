/**
 * draft-brief against a real specgate: sprich made by `specgate init`, its
 * brief with the modules `pedidos` and `pagos` and the notes of the call
 * outside both (A1). Saving the rule "Shipping is free above some amount"
 * puts specgate's own B6_unmeasured in Problems at that rule's line; "free
 * above 50 EUR" takes it away (REQ-072, A4, A5) — read from `--json`, never
 * from specgate's prose.
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

/** sprich's brief (A1), with `rule` as the first rule of `pedidos`. */
const sprichBrief = (rule: string) => `---
product: Sprich — orders for a small shop
surfaces: [web]
actors:
  - { name: Customer, surfaces: [web] }
modules: [pedidos, pagos]
---

# Sprich

## Why

A Customer orders online and pays in one step.

## Module: pedidos

Rules
- ${rule}

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

function specgate(dir: string, ...args: string[]) {
  const r = spawnSync(process.execPath, [specgateBin(), ...args], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", CI: "1" },
  });
  assert.equal(r.status, 0, `specgate ${args.join(" ")}: ${r.stdout}${r.stderr}`);
}

function sprich() {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "sg-brief-"));
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
  fs.writeFileSync(path.join(dir, "docs", "brief.md"), sprichBrief("Orders are kept a year."));
  return { parent, dir };
}

async function until<T>(read: () => T | undefined, what: string): Promise<T> {
  for (let i = 0; i < 600; i++) {
    const v = read();
    if (v !== undefined) return v;
    await new Promise((ok) => setTimeout(ok, 50));
  }
  throw new Error(`no ${what}`);
}

test('REQ-072 SCN-213 SCN-214: a real specgate\'s B6_unmeasured on "free above some amount", gone at "free above 50 EUR"', async () => {
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
      write: async (p, text) => fs.writeFileSync(path.join(dir, p), text),
    },
    brief: { specgate: cli },
  });
  const ui = await client(host.url);
  const told = (n: number) => () =>
    (ui.notes.filter((m) => m.method === "problems.changed")[n - 1]?.params as any)?.findings as
      Array<{ code: string; line?: number; fix?: string; file?: string }> | undefined;
  try {
    const vague = sprichBrief("Shipping is free above some amount.");
    await ui.ask("file.write", { path: "docs/brief.md", text: vague });
    const first = await until(told(1), "first check");
    const b6 = first.find((f) => f.code === "B6_unmeasured");
    assert.ok(b6, `B6_unmeasured in ${JSON.stringify(first)}`);
    const line = vague.split("\n").indexOf("- Shipping is free above some amount.") + 1;
    assert.equal(b6!.line, line, "at the rule's line");
    assert.equal(b6!.file, "docs/brief.md");
    assert.match(b6!.fix!, /number/);

    await ui.ask("file.write", {
      path: "docs/brief.md",
      text: sprichBrief("Shipping is free above 50 EUR."),
    });
    const second = await until(told(2), "second check");
    assert.equal(
      second.find((f) => f.code === "B6_unmeasured"),
      undefined,
      `no B6 in ${JSON.stringify(second)}`,
    );
  } finally {
    ui.close();
    await host.close();
    fs.rmSync(parent, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});
