/**
 * draft-build-live in the core: stop after this requirement, or now once the
 * Developer confirmed it; stopping ends every process the agent started
 * (REQ-105). The harness is a fake whose `stop` stands for ending its tree.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryHarnessEvents, notice } from "../src/index.js";
import { sprichBuilds } from "./sprich-build.js";

function building() {
  const events = new InMemoryHarnessEvents();
  const s = sprichBuilds([], "claude", { events });
  return { ...s, events };
}

test("REQ-105 SCN-310: stop after this requirement — REQ-030 finishes, REQ-032 never starts, and the notice says so", async () => {
  const s = building();
  await s.builds.start("REQ-030");
  await s.builds.start("REQ-032");
  const stop = await s.builds.stop(false);
  assert.deepEqual(stop, { ok: true, req: "REQ-030", now: false, queued: ["REQ-032"] });
  let live = await s.builds.live();
  assert.equal(live.stopping, true);
  assert.equal(s.harness.stopped, 0, "nothing is ended: REQ-030 goes on");

  s.events.append("REQ-030", { attempt: 1, type: "attempt", state: "start" });
  s.events.append("REQ-030", { attempt: 1, type: "attempt", state: "end", result: "pass" });
  s.harness.finish(0, { results: [{ requirement: "REQ-030", result: "pass" }] });
  await s.builds.idle();
  assert.equal(s.harness.started.length, 1, "REQ-032 did not start");
  live = await s.builds.live();
  assert.deepEqual([live.building, live.queue, live.stopping], [null, [], false]);
  assert.equal(live.requirements.find((r) => r.req === "REQ-030")?.state, "pass");
  const ended = s.commandEvents.filter((e) => e.type === "ended").at(-1);
  assert.ok(ended?.type === "ended" && ended.notice);
  assert.match(
    ended.notice!.en.ran,
    /REQ-030 finished; what was queued after it \(REQ-032\) was not started/,
  );
});

test("REQ-105 SCN-309: stop now — the build and every process it started are ended, REQ-030 shows stopped, nothing queued starts", async () => {
  const s = building();
  await s.builds.start("REQ-030");
  await s.builds.start("REQ-032");
  s.events.append("REQ-030", { attempt: 1, type: "attempt", state: "start" });
  s.events.append("REQ-030", { attempt: 1, type: "gate-start", stage: "test command: npm test" });
  const stop = await s.builds.stop(true);
  assert.deepEqual(stop, { ok: true, req: "REQ-030", now: true, queued: ["REQ-032"] });
  await s.builds.idle();
  assert.equal(s.harness.stopped, 1, "its process tree was ended");
  assert.equal(s.harness.started.length, 1, "REQ-032 did not start");
  const live = await s.builds.live();
  assert.equal(live.building, null);
  const r = live.requirements.find((x) => x.req === "REQ-030")!;
  assert.equal(r.state, "stopped");
  assert.equal(r.steps.at(-1)!.result, "fail", "the test command it ran did not finish");
  const ended = s.commandEvents.filter((e) => e.type === "ended");
  const build = ended.find((e) => e.type === "ended" && e.notice?.en.ran.includes("harness run"));
  assert.ok(build?.type === "ended");
  assert.match(build.notice!.en.ran, /ended stopped/);
  const stopped = ended.at(-1);
  assert.ok(stopped?.type === "ended");
  assert.match(stopped.notice!.en.ran, /ended the build of REQ-030 and every process it started/);
});

test("REQ-105: with no build running there is nothing to stop", async () => {
  const s = building();
  const r = await s.builds.stop(true);
  assert.equal(r.ok, false);
  assert.equal(s.harness.stopped, 0);
});

test("REQ-105: both stops say what they did, in English and Spanish", () => {
  const vars = { req: "REQ-030", queued: "REQ-032", count: "1" };
  const ok = { exitCode: 0, findings: [], written: [] };
  assert.match(
    notice("build-stop-after", "es", vars, ok).ran,
    /REQ-030 terminó; lo que estaba en cola tras él \(REQ-032\) no empezó/,
  );
  assert.match(
    notice("build-stop-now", "es", vars, ok).ran,
    /terminó la construcción de REQ-030 y todos los procesos que inició/,
  );
});
