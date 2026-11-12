/**
 * "Draft again with N requested changes" against a real specgate 0.34
 * (draft-changes REQ-083, SCN-245): sprich's draft-pedidos with two open
 * requests and one addressed in its review.md; the studio runs
 * `propose --from-brief pedidos` with the project's agent — a fake one that
 * keeps the prompt it was given, never a paid agent — and that prompt carries
 * the two open requests and not the addressed one.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { SpecgateCli, specgateBin } from "@specgate-studio/adapter-specgate-cli";
import type { RedraftResult } from "@specgate-studio/core";
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
modules: [pedidos]
---

# Sprich

## Module: pedidos

Rules
- The Customer cancels an order while it has not shipped.

Examples
- The one where Ana cancels her order of two books.
`;

const REVIEW = `# Review — draft-pedidos

| Date | Requirement | Request | Status |
|---|---|---|---|
| 2026-11-12 | REQ-031 | Cancel until 24 h before shipping | open |
| 2026-11-12 | REQ-034 | Free shipping starts at 50 EUR | open |
| 2026-11-11 | REQ-032 | Show the state of each order | addressed 2026-11-11 |
`;

function specgate(dir: string, ...args: string[]) {
  const r = spawnSync(process.execPath, [specgateBin(), ...args], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", CI: "1" },
  });
  assert.equal(r.status, 0, `specgate ${args.join(" ")}: ${r.stdout}${r.stderr}`);
}

test("REQ-083 SCN-245: a real specgate hands the fake agent the two open requests and not the addressed one", async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "sg-redraft-"));
  const prompt = path.join(parent, "prompt.txt");
  const script = path.join(parent, "fake-agent.mjs");
  fs.writeFileSync(
    script,
    `import fs from "node:fs";\nlet p = "";\nprocess.stdin.on("data", (c) => (p += c));\nprocess.stdin.on("end", () => fs.writeFileSync(${JSON.stringify(prompt)}, p));\n`,
  );
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
  fs.writeFileSync(path.join(dir, "docs", "brief.md"), BRIEF);
  specgate(dir, "propose", "--from-brief", "pedidos");
  fs.writeFileSync(
    path.join(dir, "docs", "specs", "changes", "draft-pedidos", "review.md"),
    REVIEW,
  );
  specgate(dir, "config", "set", "agent", `node "${script}" < {prompt_file}`);
  // specgate finds what the agent wrote, and undoes the rest, through git.
  for (const args of [
    ["add", "-A"],
    [
      "-c",
      "user.name=sprich",
      "-c",
      "user.email=sprich@example.com",
      "commit",
      "-qm",
      "draft-pedidos",
    ],
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
    changes: { specgate: cli },
    brief: { specgate: cli },
  });
  const ui = await client(host.url);
  try {
    const card = (
      (
        await ui.ask<{
          groups: Record<string, Array<{ id: string; review: { open: number } | null }>>;
        }>("changes.get")
      ).result!.groups.review ?? []
    ).find((c) => c.id === "draft-pedidos");
    assert.equal(card?.review?.open, 2, JSON.stringify(card));
    const r = (await ui.ask<RedraftResult>("changes.redraft", { change: "draft-pedidos" })).result!;
    assert.ok(r.ok, JSON.stringify(r));
    const started = ui.notes.find(
      (n) => n.method === "command.event" && (n.params as { type: string }).type === "started",
    );
    assert.match(
      (started!.params as { command: string }).command,
      /^specgate propose --from-brief pedidos --agent /,
    );
    const said = ui.notes
      .filter((n) => n.method === "command.event")
      .map((n) => JSON.stringify(n.params))
      .join("\n");
    assert.ok(fs.existsSync(prompt), `the agent ran: ${said}`);
    const given = fs.readFileSync(prompt, "utf8");
    assert.match(given, /Cancel until 24 h before shipping/);
    assert.match(given, /Free shipping starts at 50 EUR/);
    assert.doesNotMatch(given, /Show the state of each order/, "not the addressed one");
  } finally {
    ui.close();
    await host.close();
    fs.rmSync(parent, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});
