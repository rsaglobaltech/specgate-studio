/**
 * draft-project-setup — the setup's port over the real specgate: `onboard`,
 * `config list` and `ci status` as JSON (REQ-113 … REQ-115), and the preview
 * the studio makes of them against what `specgate adopt` then writes
 * (REQ-112): the same files, and no file of the project changed.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { ADOPT_FILES, adoptPreview, hasTests, CI_GATE } from "@specgate-studio/core";
import { SpecgateCli, SpecgateSetup, specgateBin } from "../src/index.js";
import { codeFolder, snapshot, withClaude } from "./fixture.js";

const setup = (dir: string) =>
  new SpecgateSetup(
    new SpecgateCli({ program: process.execPath, prefix: [specgateBin()], projectDir: dir }),
  );

const adopt = (dir: string) =>
  spawnSync(process.execPath, [specgateBin(), "adopt", "--yes", "--project-dir", dir], {
    encoding: "utf8",
    env: { ...process.env, CI: "1" },
  });

test("REQ-112 REQ-113 SCN-333 SCN-334 SCN-335: shop's preview is what `specgate adopt` writes — no more, no less — and shop's files stay byte for byte", async () => {
  const dir = codeFolder("shop", ["billing", "invoices", "utils"], { tests: true });
  const path_ = withClaude(true);
  try {
    const onboard = await setup(dir).onboard();
    assert.deepEqual(onboard, { adopted: false, testCommand: "npm test", areas: 2, byKind: false });
    const before = snapshot(dir);
    const preview = adoptPreview({
      present: new Set(before.keys()),
      areas: onboard.areas,
      testCommand: onboard.testCommand,
      hasTests: hasTests(fs.readFileSync(path.join(dir, "package.json"), "utf8"), [
        ...before.keys(),
      ]),
      found: ["claude"],
      config: await setup(dir).config(),
    });
    assert.deepEqual(preview.settings, { test_cmd: "npm test", agent: "claude" });

    const run = adopt(dir);
    assert.equal(run.status, 0, run.stdout + run.stderr);
    const after = snapshot(dir);
    const written = [...after.keys()].filter((f) => !before.has(f)).sort();
    assert.deepEqual(written, [...preview.files].sort(), "the preview names every file written");
    for (const [f, bytes] of before) assert.ok(after.get(f)?.equals(bytes), `${f} unchanged`);

    // What is ready now (REQ-114): the settings the preview showed, and the CI gate.
    const config = await setup(dir).config();
    assert.equal(config.test_cmd, "npm test");
    assert.match(config.agent ?? "", /^claude /);
    assert.equal(await setup(dir).ciFile(), CI_GATE);
    assert.equal((await setup(dir).onboard()).adopted, true);
  } finally {
    path_.restore();
    fs.rmSync(path.dirname(dir), { recursive: true, force: true });
  }
});

test("REQ-113 SCN-336: no test and no Claude Code — adoption saves neither, as the preview says", async () => {
  const dir = codeFolder("shop", ["billing"]);
  const path_ = withClaude(false);
  try {
    const onboard = await setup(dir).onboard();
    const before = snapshot(dir);
    const preview = adoptPreview({
      present: new Set(before.keys()),
      areas: onboard.areas,
      testCommand: onboard.testCommand,
      hasTests: hasTests(fs.readFileSync(path.join(dir, "package.json"), "utf8"), [
        ...before.keys(),
      ]),
      found: [],
      config: {},
    });
    assert.deepEqual(preview.settings, { test_cmd: null, agent: null });
    assert.ok(preview.noTest);
    assert.equal(adopt(dir).status, 0);
    assert.deepEqual(await setup(dir).config(), {});
    assert.ok(!fs.existsSync(path.join(dir, "harness.config.yaml")));
    for (const f of ADOPT_FILES) assert.ok(fs.existsSync(path.join(dir, f)), f);
  } finally {
    path_.restore();
    fs.rmSync(path.dirname(dir), { recursive: true, force: true });
  }
});

test("REQ-115 SCN-340: code organised by kind — onboard finds no area and says it is by kind", async () => {
  const dir = codeFolder("react-app", ["components", "hooks", "utils"], { tests: true });
  try {
    const onboard = await setup(dir).onboard();
    assert.equal(onboard.areas, 0);
    assert.equal(onboard.byKind, true);
  } finally {
    fs.rmSync(path.dirname(dir), { recursive: true, force: true });
  }
});
