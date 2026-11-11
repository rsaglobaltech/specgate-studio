/**
 * draft-build-live in the core: Build waits on uncommitted work that is not
 * the specification, says why, and offers commit, stash or ignore — each run
 * only once confirmed, its files grouped by folder (REQ-102). A build is
 * `specgate harness run --req <REQ> --format json` (A5), told as any run.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  GIT_WRITER_CONTRACT,
  InMemoryGit,
  harnessArgs,
  notice,
  uncommittedWork,
} from "../src/index.js";
import { ROOT, files325, sprichBuilds } from "./sprich-build.js";

test("REQ-102: the specification is spec.md, docs/specs/ and features/; the rest is grouped by folder, largest first (A6)", () => {
  const work = uncommittedWork([
    "spec.md",
    "docs/specs/changes/draft-pedidos/questions.md",
    "features/orders/REQ-030.feature",
    ...files325(),
  ]);
  assert.deepEqual(work.specification, [
    "spec.md",
    "docs/specs/changes/draft-pedidos/questions.md",
    "features/orders/REQ-030.feature",
  ]);
  assert.equal(work.other.total, 325);
  assert.deepEqual(
    work.other.groups.map((g) => [g.group, g.files.length]),
    [
      ["src/orders", 200],
      ["src/web", 100],
      ["test", 25],
    ],
  );
});

test("REQ-102: a build is `harness run --req <REQ> --format json`; anything else is no requirement", () => {
  assert.deepEqual(harnessArgs("REQ-030"), [
    "harness",
    "run",
    "--req",
    "REQ-030",
    "--format",
    "json",
  ]);
  assert.equal(harnessArgs("--agent=rm -rf"), null);
});

test("REQ-102 SCN-303: Build on REQ-030 with 325 uncommitted files waits, says why, and shows them by folder; nothing runs", async () => {
  const s = sprichBuilds(files325());
  const r = await s.builds.start("REQ-030");
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.code === "build_waits");
  if (r.ok || r.code !== "build_waits") return;
  assert.equal(r.waits.total, 325);
  assert.deepEqual(
    r.waits.groups.map((g) => g.group),
    ["src/orders", "src/web", "test"],
  );
  assert.deepEqual(s.harness.started, [], "no build started");
  assert.deepEqual(s.git.commits, []);
});

test('REQ-102 SCN-303: commit confirmed — one commit of the 325 files with "Work in progress before building REQ-030", then the build of REQ-030 starts', async () => {
  const s = sprichBuilds(files325());
  const r = await s.builds.resolve("REQ-030", {
    choice: "commit",
    message: "Work in progress before building REQ-030",
  });
  assert.equal(r.ok, true);
  assert.equal(s.git.commits.length, 1);
  assert.equal(s.git.commits[0]!.message, "Work in progress before building REQ-030");
  assert.equal(s.git.commits[0]!.files.length, 325);
  assert.deepEqual(await s.git.uncommitted(ROOT), []);
  assert.deepEqual(s.harness.started, [harnessArgs("REQ-030")]);
  // Both told as runs: the commit, then the build.
  const started = s.events
    .filter((e) => e.type === "started")
    .map((e) => (e as { command: string }).command);
  assert.match(started[0]!, /^git commit -m 'Work in progress before building REQ-030'/);
  assert.equal(started[1], "specgate harness run --req REQ-030");
  const ended = s.events.find((e) => e.type === "ended");
  assert.ok(ended?.type === "ended" && ended.notice);
  assert.match(ended.notice!.en.ran, /committed the 325 files shown/);
  assert.match(ended.notice!.en.wrote, /src\/orders \(200 files\)/);
});

test("REQ-102: a commit with no message is refused before git runs", async () => {
  const s = sprichBuilds(files325());
  const r = await s.builds.resolve("REQ-030", { choice: "commit", message: "  " });
  assert.ok(!r.ok && r.code === "build_no_message");
  assert.deepEqual(s.git.commits, []);
});

test("REQ-102 SCN-304: stash confirmed — `git stash --include-untracked`, then the build starts", async () => {
  const s = sprichBuilds(["src/orders/cancel.ts", "README.md"]);
  const r = await s.builds.resolve("REQ-030", { choice: "stash" });
  assert.equal(r.ok, true);
  assert.equal(s.git.stashes, 1);
  assert.deepEqual(await s.git.uncommitted(ROOT), []);
  assert.deepEqual(s.harness.started, [harnessArgs("REQ-030")]);
});

test("REQ-102 SCN-304: a stash not confirmed runs nothing: the files stay, and Build still waits", async () => {
  const s = sprichBuilds(["src/orders/cancel.ts"]);
  // The Developer cancels: the UI never asks resolve. Build asked again still waits.
  const again = await s.builds.start("REQ-030");
  assert.ok(!again.ok && again.code === "build_waits");
  assert.equal(s.git.stashes, 0);
  assert.deepEqual(await s.git.uncommitted(ROOT), ["src/orders/cancel.ts"]);
});

test("REQ-102: ignore is refused: specgate 0.33.2's harness will not run on uncommitted files", async () => {
  const s = sprichBuilds(["src/orders/cancel.ts"]);
  const r = await s.builds.resolve("REQ-030", { choice: "ignore" });
  assert.ok(!r.ok && r.code === "build_ignore_unsupported");
  assert.deepEqual(s.harness.started, []);
});

test("REQ-102: uncommitted specification alone does not make Build wait: it is committed first, said as a run", async () => {
  const s = sprichBuilds(["spec.md", "docs/specs/changes/draft-pedidos/questions.md"]);
  const r = await s.builds.start("REQ-030");
  assert.equal(r.ok, true);
  assert.deepEqual(s.git.commits, [
    {
      message: "chore(spec): save the specification before building REQ-030",
      files: ["spec.md", "docs/specs/changes/draft-pedidos/questions.md"],
    },
  ]);
  assert.deepEqual(s.harness.started, [harnessArgs("REQ-030")]);
});

test("REQ-102: Build refuses what is not ready, and with no agent names the command that sets one", async () => {
  const s = sprichBuilds();
  const blocked = await s.builds.start("REQ-031");
  assert.ok(!blocked.ok && blocked.code === "build_not_ready");
  const none = sprichBuilds([], null);
  const r = await none.builds.start("REQ-030");
  assert.ok(!r.ok && r.code === "build_no_agent");
  assert.match(!r.ok ? r.message : "", /specgate agents init --tool claude/);
  assert.deepEqual(none.harness.started, []);
});

test("REQ-102: the build ends with its notice — passed on its branch, or specgate's refusal with its code", async () => {
  const s = sprichBuilds();
  await s.builds.start("REQ-030");
  s.harness.finish(0, {
    schemaVersion: 1,
    results: [{ requirement: "REQ-030", result: "pass", branch: "harness/REQ-030", attempts: 1 }],
  });
  await s.builds.idle();
  const ended = s.events.filter((e) => e.type === "ended").pop();
  assert.ok(ended?.type === "ended" && ended.notice);
  assert.equal(ended.notice!.en.tone, "ok");
  assert.match(ended.notice!.en.ran, /built REQ-030 on its branch/);
  assert.match(ended.notice!.en.wrote, /harness\/REQ-030/);
  assert.match(ended.notice!.es.ran, /construyó REQ-030 en su rama/);

  const t = sprichBuilds();
  await t.builds.start("REQ-030");
  t.harness.finish(1, {
    results: null,
    status: [
      { severity: "error", code: "harness_run_error", message: "Working tree is not clean." },
    ],
  });
  await t.builds.idle();
  const refused = t.events.filter((e) => e.type === "ended").pop();
  assert.ok(refused?.type === "ended" && refused.notice);
  assert.equal(refused.notice!.en.tone, "refused");
  assert.match(refused.notice!.en.ran, /harness_run_error/);
});

test("REQ-102: a build that ends without passing says how it ended, never a bare done", () => {
  const n = notice(
    "build",
    "en",
    { req: "REQ-030" },
    {
      exitCode: 1,
      findings: [],
      written: [],
      ended: { code: "fail", message: "Gate stopped at: test command" },
    },
  );
  assert.equal(n.tone, "failed");
  assert.match(
    n.ran,
    /specgate harness run --req REQ-030` ended fail: Gate stopped at: test command/,
  );
});

for (const check of GIT_WRITER_CONTRACT) {
  test(`REQ-102: the in-memory git — ${check.name}`, () =>
    check.run(async (repo) => ({
      port: new InMemoryGit({
        "/r": { branch: "main", uncommitted: [...repo.uncommitted, ...repo.deleted] },
      }),
      root: "/r",
    })));
}
