/**
 * draft-changes against a real specgate: a project made by `specgate init`
 * with a change ready to archive and one with a requirement no test names.
 * Changes groups them (REQ-081); Archive's preview is the real `archive
 * --dry-run` and writes nothing (REQ-085); a real Apply refusal is told from
 * `apply --json`'s finding through the CLI adapter (REQ-086, help REQ-063).
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

function specgate(dir: string, ...args: string[]) {
  const r = spawnSync(process.execPath, [specgateBin(), ...args], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", CI: "1" },
  });
  assert.equal(r.status, 0, `specgate ${args.join(" ")}: ${r.stdout}${r.stderr}`);
  return r.stdout;
}

/** Opens a change with one requirement; returns its id. */
function change(dir: string, id: string, title: string): string {
  const opened = JSON.parse(specgate(dir, "propose", id, "--json")) as {
    change: { reqRange: [string, string]; created: string[] };
  };
  const req = opened.change.reqRange[0];
  const scn = `SCN-${req.slice(4)}`;
  const delta = opened.change.created.find((f) =>
    /specs\/.+\/spec\.md$/.test(f.replace(/\\/g, "/")),
  )!;
  fs.writeFileSync(
    path.join(dir, delta),
    `# Delta — ${id}\n\n## ADDED Requirements\n\n### Requirement: ${req} — ${title}\n\n` +
      `<!-- specgate:trace actor=Customer kind=business-rule -->\n\n` +
      `The system SHALL ${title.toLowerCase()}.\n\n#### Scenario: ${scn} — ${title}\n\n` +
      `- GIVEN an order\n- WHEN it is shown\n- THEN ${title.toLowerCase()}\n`,
  );
  return req;
}

/** sprich: fix-rounding with its requirement applied, add-coupons with one no test names. */
function sprich() {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "sg-chg-"));
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
  specgate(dir, "config", "set", "test_cmd", "node -e 0");
  const rounding = change(dir, "fix-rounding", "Round totals half up");
  fs.mkdirSync(path.join(dir, "test"), { recursive: true });
  fs.writeFileSync(path.join(dir, "test", "rounding.test.js"), `// ${rounding}: rounds half up\n`);
  specgate(dir, "apply", rounding);
  const coupon = change(dir, "add-coupons", "Apply a coupon once");
  return { parent, dir, rounding, coupon };
}

test("REQ-081 REQ-085 REQ-086 against specgate: grouped, the archive previewed with nothing written, Apply refused with apply_no_test", async () => {
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
    // REQ-081: the groups from change list, status and change show.
    const view = (await ui.ask<any>("changes.get")).result;
    assert.deepEqual(
      view.groups.ready.map((c: any) => c.id),
      ["fix-rounding"],
    );
    assert.deepEqual(
      view.groups.progress.map((c: any) => [c.id, c.toApply]),
      [["add-coupons", [p.coupon]]],
    );

    // REQ-085 SCN-249: the preview is the real dry run — it lists, it writes nothing.
    const preview = (
      await ui.ask<any>("command.run", { name: "archive-preview", change: "fix-rounding" })
    ).result;
    assert.equal(preview.exitCode, 0, JSON.stringify(preview));
    const kinds = preview.preview.writes.map((w: any) => w.kind).sort();
    assert.ok(
      kinds.includes("spec") && kinds.includes("traceability"),
      JSON.stringify(preview.preview),
    );
    const spec = preview.preview.writes.find((w: any) => w.kind === "spec").file as string;
    assert.equal(fs.existsSync(path.join(p.dir, spec)), false, "the preview wrote nothing");
    assert.ok(fs.existsSync(path.join(p.dir, "docs", "specs", "changes", "fix-rounding")));

    // REQ-086 SCN-251, help REQ-063 SCN-186: the refusal from `apply --json`'s finding.
    const applied = (await ui.ask<any>("command.run", { name: "apply", req: p.coupon })).result;
    assert.notEqual(applied.exitCode, 0);
    assert.equal(applied.findings[0]?.code, "apply_no_test");
    const ended = ui.notes
      .filter((n) => n.method === "command.event" && (n.params as any).type === "ended")
      .at(-1)?.params as any;
    assert.equal(ended.notice.en.tone, "refused");
    assert.match(
      ended.notice.en.ran,
      new RegExp(`\`specgate apply ${p.coupon}\` was refused with apply_no_test`),
    );
    assert.equal(ended.notice.en.wrote, "Nothing was written.");
    assert.match(ended.notice.en.fix, new RegExp(`write a test that names ${p.coupon}`));

    // REQ-085: confirmed, the archive writes what the preview said, and its notice names it.
    const archived = (await ui.ask<any>("command.run", { name: "archive", change: "fix-rounding" }))
      .result;
    assert.equal(archived.exitCode, 0, JSON.stringify(archived));
    assert.ok(archived.written.includes(spec));
    assert.ok(fs.existsSync(path.join(p.dir, spec)));
    const done = ui.notes
      .filter((n) => n.method === "command.event" && (n.params as any).type === "ended")
      .at(-1)?.params as any;
    assert.equal(done.notice.en.tone, "ok");
    assert.ok(done.notice.en.wrote.includes(spec));
  } finally {
    ui.close();
    await host.close();
    fs.rmSync(p.parent, { recursive: true, force: true });
  }
});
