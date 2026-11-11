/**
 * draft-build-live against a real specgate: `specgate harness run` builds
 * REQ-000 with a fake agent — no paid agent ever runs — through the host's
 * Node adapters: git for what is uncommitted and the commit the Developer
 * confirms, the harness as a process the host waits for (REQ-102).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { endedOf, harnessProject, realHost, remove } from "./harness-fixture.js";

test("REQ-102 SCN-303 against specgate: an uncommitted file makes Build wait; committed with the Developer's message, `harness run` builds REQ-000 on its branch", async () => {
  const p = harnessProject();
  fs.mkdirSync(path.join(p.dir, "src"), { recursive: true });
  fs.writeFileSync(path.join(p.dir, "src", "wip.js"), "// work in progress\n");
  const { host, ui } = await realHost(p.dir);
  try {
    const list = (await ui.ask<any>("build.get")).result;
    assert.ok(
      list.ready.some((r: any) => r.id === "REQ-000"),
      JSON.stringify(list),
    );
    assert.equal(list.agent, "node");

    const waits = (await ui.ask<any>("build.start", { req: "REQ-000" })).result;
    assert.equal(waits.code, "build_waits", JSON.stringify(waits));
    assert.deepEqual(waits.waits.groups, [{ group: "src", files: ["src/wip.js"] }]);

    const started = (
      await ui.ask<any>("build.resolve", {
        req: "REQ-000",
        choice: "commit",
        message: "Work in progress before building REQ-000",
      })
    ).result;
    assert.equal(started.ok, true, JSON.stringify(started));
    const log = spawnSync("git", ["log", "-1", "--format=%s"], { cwd: p.dir, encoding: "utf8" });
    assert.equal(log.stdout.trim(), "Work in progress before building REQ-000");

    const ended = await endedOf(ui, "specgate harness run --req REQ-000");
    assert.equal(ended.exitCode, 0, JSON.stringify(ended));
    assert.equal(ended.notice.en.tone, "ok");
    assert.match(ended.notice.en.wrote, /harness\/REQ-000/);
    const branch = spawnSync("git", ["branch", "--list", "harness/REQ-000"], {
      cwd: p.dir,
      encoding: "utf8",
    });
    assert.match(branch.stdout, /harness\/REQ-000/);
  } finally {
    ui.close();
    await host.close();
    await remove(p.parent);
  }
});
