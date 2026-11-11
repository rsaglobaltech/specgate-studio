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
import { startProjectHost } from "../src/index.js";
import { client } from "./rpc.js";
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

test("REQ-103 SCN-305 against specgate: Live folds the real harness's events — REQ-000's steps with their times, the agent's output, its cost and tokens — and tells every UI", async () => {
  const p = harnessProject();
  const { host, ui } = await realHost(p.dir);
  try {
    const started = (await ui.ask<any>("build.start", { req: "REQ-000" })).result;
    assert.equal(started.ok, true, JSON.stringify(started));
    await endedOf(ui, "specgate harness run --req REQ-000");
    const view = (await ui.ask<any>("live.get")).result;
    const r = view.requirements.find((x: any) => x.req === "REQ-000");
    assert.ok(r, JSON.stringify(view));
    assert.equal(r.state, "pass");
    const write = r.steps.find((s: any) => s.kind === "write");
    assert.deepEqual(
      [write.label, write.seconds, write.result],
      ["test/health.test.js", 1.5, "ok"],
    );
    assert.ok(
      r.steps.some((s: any) => s.kind === "gate" && s.result === "pass" && s.seconds !== null),
      JSON.stringify(r.steps),
    );
    assert.ok(view.output.some((l: any) => l.text === "Reading the scenario of REQ-000"));
    assert.equal(view.totals.cost, 0.12);
    assert.equal(view.totals.input, 1200);
    assert.equal(view.building, null);
    assert.ok(
      ui.notes.some((n) => n.method === "live.changed"),
      "Live was told without being asked",
    );
  } finally {
    ui.close();
    await host.close();
    await remove(p.parent);
  }
});

test("REQ-104 SCN-307 against specgate: the agent asks with `specgate ask`; specgate records it when the run ends; Live answers it with `specgate answer`", async () => {
  const p = harnessProject();
  p.mode("ask");
  const { host, ui } = await realHost(p.dir);
  try {
    assert.equal((await ui.ask<any>("build.start", { req: "REQ-000" })).result.ok, true);
    const ended = await endedOf(ui, "specgate harness run --req REQ-000");
    assert.equal(ended.notice.en.tone, "failed");
    assert.match(ended.notice.en.ran, /ended question/);
    // What specgate recorded is read again once the run ended.
    let q: any;
    for (const end = Date.now() + 30_000; ;) {
      q = (await ui.ask<any>("live.get")).result.questions[0];
      if (q?.id) break;
      if (Date.now() > end) throw new Error(`no question recorded: ${JSON.stringify(q)}`);
      await new Promise((r) => setTimeout(r, 200));
    }
    assert.equal(q.req, "REQ-000");
    assert.equal(q.text, "Round to the cent or to the nearest 5 cents?");
    assert.equal(q.answer, null);
    const answered = (
      await ui.ask<any>("command.run", {
        name: "answer",
        q: q.id,
        answer: "to the cent",
        change: q.change,
      })
    ).result;
    assert.equal(answered.exitCode, 0, JSON.stringify(answered));
    for (const end = Date.now() + 30_000; ;) {
      q = (await ui.ask<any>("live.get")).result.questions[0];
      if (q?.answer) break;
      if (Date.now() > end) throw new Error(`the answer is not recorded: ${JSON.stringify(q)}`);
      await new Promise((r) => setTimeout(r, 200));
    }
    assert.equal(q.answer, "to the cent");
  } finally {
    ui.close();
    await host.close();
    await remove(p.parent);
  }
});

/** Whether a process is still running. */
function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

test("REQ-105 SCN-309 against specgate: Stop now ends `harness run`, its agent and the test server the agent started", async () => {
  const p = harnessProject();
  p.mode("slow");
  const { host, ui } = await realHost(p.dir);
  try {
    assert.equal((await ui.ask<any>("build.start", { req: "REQ-000" })).result.ok, true);
    // The agent runs its tests: itself and a child that would run for a minute.
    for (const end = Date.now() + 60_000; p.pids().length < 2;) {
      if (Date.now() > end) throw new Error("the agent did not start its tests");
      await new Promise((r) => setTimeout(r, 100));
    }
    const pids = p.pids();
    assert.ok(pids.every(alive), "the agent and its child run");
    const stop = (await ui.ask<any>("build.stop", { now: true })).result;
    assert.deepEqual(stop, { ok: true, req: "REQ-000", now: true, queued: [] });
    const ended = await endedOf(ui, "specgate harness run --req REQ-000");
    assert.match(ended.notice.en.ran, /ended stopped/);
    for (const end = Date.now() + 10_000; pids.some(alive);) {
      if (Date.now() > end) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.deepEqual(pids.filter(alive), [], "no process the agent started is still running");
    const live = (await ui.ask<any>("live.get")).result;
    assert.equal(live.building, null);
    assert.equal(live.requirements[0].state, "stopped");
  } finally {
    ui.close();
    await host.close();
    for (const pid of p.pids()) if (alive(pid)) process.kill(pid);
    await remove(p.parent);
  }
});

test("REQ-101: the studio as it runs — `specgate-studio serve` on a project answers build.get and live.get from the real specgate", async () => {
  const p = harnessProject();
  const host = await startProjectHost(p.dir, { home: path.join(p.parent, "home") });
  const ui = await client(host.url);
  try {
    const list = await ui.ask<any>("build.get");
    assert.equal(list.error, undefined, JSON.stringify(list.error));
    assert.ok(list.result.ready.some((r: any) => r.id === "REQ-000"));
    assert.equal(list.result.agent, "node");
    const live = await ui.ask<any>("live.get");
    assert.equal(live.error, undefined, JSON.stringify(live.error));
    assert.equal(live.result.building, null);
  } finally {
    ui.close();
    await host.close();
    await remove(p.parent);
  }
});
