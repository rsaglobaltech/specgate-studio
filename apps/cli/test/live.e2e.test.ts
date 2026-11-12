/**
 * draft-build-live in a real browser: Live shows each requirement's steps
 * with their time, the agent's output as it streams, the queue, cost and
 * tokens (REQ-103). The harness and its events are fakes the test writes as
 * specgate and the agent would; the desktop scenarios run the same bundle.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { close, open, studio, type Page } from "./support.js";
import { SPRICH, buildAnswers } from "./build-support.js";

const text = async (page: Page, sel: string) => (await page.textContent(sel)) ?? "";

const ASKED = "Round to the cent or to the nearest 5 cents?";
/** What specgate records once the agent asked (A10): Q3 of draft-pedidos, blocking REQ-030. */
const Q3 = {
  id: "Q3",
  change: "draft-pedidos",
  text: ASKED,
  blocks: ["REQ-030"],
  options: [],
  asked: "build",
};

/** sprich with REQ-030 building and REQ-032 queued after it, pressed in Build. */
async function building(questions: unknown[] = []) {
  const s = await studio({
    homeRequirements: SPRICH as never,
    specgate: buildAnswers("claude -p < {prompt_file}"),
    questions: { open: questions, answered: [] },
  });
  const page = await open(s);
  await page.click('.sga[data-view="build"]');
  await page.waitForSelector(".breq");
  await page.click('.breq[data-req="REQ-030"] [data-act="build"]');
  await page.waitForSelector('.bstarted[data-req="REQ-030"]');
  await page.click('.breq[data-req="REQ-032"] [data-act="build"]');
  await page.waitForSelector('.bstarted[data-req="REQ-032"][data-queued]');
  // What specgate and the agent write as REQ-030 builds.
  const now = Date.now() / 1000;
  const e = (event: Record<string, unknown>) =>
    s.events.append("REQ-030", { attempt: 1, ...event });
  e({ type: "attempt", state: "start" });
  e({ type: "agent", model: "claude-sonnet" });
  e({ type: "message", text: "Reading the scenario of REQ-030" });
  e({
    type: "step",
    kind: "write",
    tool: "Write",
    target: "test/cancel.test.ts",
    started: now - 20,
    ended: now - 7.75,
    result: "ok",
  });
  e({
    type: "usage",
    final: true,
    input: 12000,
    output: 1500,
    cacheRead: 30000,
    cacheWrite: 0,
    cost: 0.42,
  });
  e({ type: "gate-start", stage: "validate --strict" });
  e({ type: "gate", stage: "validate --strict", result: "pass", ms: 1200 });
  e({ type: "gate-start", stage: "test command: npm test" });
  return { s, page, e };
}

async function live(page: Page) {
  await page.click('.sga[data-view="live"]');
  await page.waitForSelector('.lreq[data-req="REQ-030"] .lstep[data-result="running"]');
}

/** REQ-030's agent asks instead of guessing; its run ends, and specgate recorded Q3. */
async function asks(s: Awaited<ReturnType<typeof building>>["s"]) {
  s.events.append("REQ-030", { attempt: 1, type: "question", text: ASKED });
  s.events.append("REQ-030", { attempt: 1, type: "attempt", state: "end", result: "question" });
  s.harness.finish(1, {
    results: [
      {
        requirement: "REQ-030",
        result: "question",
        error: `Needs clarification: Q3 in docs/specs/changes/draft-pedidos/questions.md — specgate answer Q3 "…"`,
      },
    ],
  });
}

test('REQ-104 SCN-307: the agent asks on the desktop — "to the cent" answered in Live through specgate, the answer recorded under the question, the agent\'s output going on', async () => {
  const { s, page } = await building([Q3]);
  try {
    await live(page);
    await asks(s);
    const open = '.lquestion[data-req="REQ-030"][data-question="Q3"][data-state="open"]';
    await page.waitForSelector(open);
    assert.match(await text(page, open), /Round to the cent or to the nearest 5 cents\?/);
    assert.equal(await page.getAttribute('.lreq[data-req="REQ-030"]', "data-state"), "question");
    await page.fill(`${open} input`, "to the cent");
    await page.click(`${open} [data-act="answer"]`);
    const answered = '.lquestion[data-question="Q3"][data-state="answered"]';
    await page.waitForSelector(answered);
    assert.equal(await text(page, `${answered} [data-answer]`), "to the cent");
    assert.deepEqual(s.runs, [["answer", "Q3", "to the cent", "--change", "draft-pedidos"]]);
    // The run goes on: REQ-032 builds, and its agent's output streams into Live.
    assert.equal(s.harness.started.at(-1)![3], "REQ-032");
    s.events.append("REQ-032", { attempt: 1, type: "attempt", state: "start" });
    s.events.append("REQ-032", {
      attempt: 1,
      type: "step",
      kind: "read",
      tool: "Read",
      target: "src/orders/refund.ts",
      result: "ok",
    });
    await page.waitForSelector(
      '[data-testid="live-output"] li[data-req="REQ-032"]:has-text("src/orders/refund.ts")',
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-104 SCN-308: the same question answered in the browser — recorded, and gone from every open tab", async () => {
  const { s, page } = await building([Q3]);
  const second = await open(s, { lang: "es" });
  try {
    await live(page);
    await live(second);
    await asks(s);
    const open = '.lquestion[data-question="Q3"][data-state="open"]';
    await page.waitForSelector(open);
    await second.waitForSelector(open);
    await second.fill(`${open} input`, "to the cent");
    await second.click(`${open} [data-act="answer"]`);
    for (const p of [second, page]) {
      await p.waitForSelector('.lquestion[data-question="Q3"][data-state="answered"]');
      assert.equal(await p.$(open), null, "no longer asked in this tab");
    }
    assert.match(
      await text(second, '.lquestion[data-question="Q3"]'),
      /Respuesta guardada:\s*to the cent/,
    );
    assert.deepEqual(s.runs, [["answer", "Q3", "to the cent", "--change", "draft-pedidos"]]);
  } finally {
    await second.close();
    await close(s, page);
  }
});

test('REQ-105 SCN-309: "Parar ya…" in Live\'s header on the desktop — confirmed, the build stopped and its processes ended; cancelled, nothing stops', async () => {
  const { s, page: first } = await building();
  await first.close();
  const page = await open(s, { lang: "es" });
  try {
    await live(page);
    assert.equal(await text(page, '.lbar .lstop [data-act="stop-now"]'), "Parar ya…");
    assert.equal(
      await text(page, '.lbar .lstop [data-act="stop-after"]'),
      "Parar tras este requisito",
    );
    await page.click('.lbar .lstop [data-act="stop-now"]');
    await page.waitForSelector('[data-confirm="stop-now"]');
    assert.match(
      await text(page, '[data-confirm="stop-now"]'),
      /¿Parar ya la construcción de REQ-030\?/,
    );
    await page.click('[data-confirm="stop-now"] [data-act="cancel"]');
    await page.waitForSelector('[data-confirm="stop-now"]', { state: "detached" });
    assert.equal(s.harness.stopped, 0, "cancelled: nothing stops");

    await page.click('.lstop [data-act="stop-now"]');
    await page.click('[data-confirm="stop-now"] [data-act="confirm"]');
    await page.waitForSelector('.lreq[data-req="REQ-030"][data-state="stopped"]');
    await page.waitForSelector('.live[data-building=""]');
    assert.equal(s.harness.stopped, 1, "the harness's process tree was ended");
    assert.equal(s.harness.started.length, 1, "REQ-032 did not start");
    assert.equal(await page.$(".lstop"), null, "nothing left to stop");
    await page.waitForSelector('.notice[data-tone]:has-text("todos los procesos que inició")');
  } finally {
    await close(s, page);
  }
});

test('REQ-105 SCN-310: "Stop after this requirement" in Live\'s header in the browser — REQ-030 finishes, REQ-032 does not start', async () => {
  const { s, page } = await building();
  try {
    await live(page);
    assert.equal(
      await text(page, '.lbar .lstop [data-act="stop-after"]'),
      "Stop after this requirement",
    );
    await page.click('.lbar .lstop [data-act="stop-after"]');
    await page.waitForSelector('[data-testid="live-stopping"]');
    assert.match(
      await text(page, '[data-testid="live-stopping"]'),
      /Stops once REQ-030 ends: REQ-032 will not start/,
    );
    assert.equal(await page.$('[data-confirm="stop-now"]'), null, "no confirmation asked");
    assert.equal(s.harness.stopped, 0, "REQ-030 goes on");
    // specgate's harness is asked too: it starts no other requirement (specgate 0.34, REQ-491).
    for (
      let i = 0;
      i < 100 && !s.calls.some((c) => c.join(" ") === "harness stop --after-current");
      i++
    )
      await new Promise((ok) => setTimeout(ok, 20));
    assert.ok(s.calls.some((c) => c.join(" ") === "harness stop --after-current"));

    s.events.append("REQ-030", {
      attempt: 1,
      type: "gate",
      stage: "test command: npm test",
      result: "pass",
      ms: 7000,
    });
    s.events.append("REQ-030", { attempt: 1, type: "attempt", state: "end", result: "pass" });
    s.harness.finish(0, { results: [{ requirement: "REQ-030", result: "pass" }] });
    await page.waitForSelector('.lreq[data-req="REQ-030"][data-state="pass"]');
    await page.waitForSelector('.live[data-building=""]');
    assert.equal(s.harness.started.length, 1, "REQ-032 was not started");
    assert.match(await text(page, '[data-testid="live-queue"]'), /nothing queued/);
    await page.waitForSelector('.notice[data-tone]:has-text("REQ-030 finished")');
  } finally {
    await close(s, page);
  }
});

test("REQ-103 REQ-201: Live during REQ-030 from `harness run --format jsonl` as it streams — the action and the agent's words before any events file says them", async () => {
  const s = await studio({
    homeRequirements: SPRICH as never,
    specgate: buildAnswers("claude -p < {prompt_file}"),
  });
  const page = await open(s);
  try {
    await page.click('.sga[data-view="build"]');
    await page.waitForSelector(".breq");
    await page.click('.breq[data-req="REQ-030"] [data-act="build"]');
    await page.waitForSelector('.bstarted[data-req="REQ-030"]');
    await page.click('.sga[data-view="live"]');
    const t = Date.now() / 1000;
    s.harness.stream({ type: "attempt", t, req: "REQ-030", attempt: 1, state: "start" });
    s.harness.stream({
      type: "output",
      t,
      req: "REQ-030",
      attempt: 1,
      stream: "stdout",
      text: "Writing the test of SCN-030a",
    });
    s.harness.stream({
      type: "step",
      t: t + 1,
      req: "REQ-030",
      attempt: 1,
      kind: "write",
      tool: "Write",
      target: "test/cancel.test.ts",
      result: "ok",
    });
    await page.waitForSelector(
      '[data-testid="live-output"] li[data-kind="write"]:has-text("test/cancel.test.ts")',
    );
    // The agent's own words: the AGENTE tab (draft-live-polish A3).
    await page.click('.ltabs [data-tab="agent"]');
    await page.waitForSelector('[data-kind="output"] >> text=Writing the test of SCN-030a');
    s.harness.finish(0, { results: [{ requirement: "REQ-030", result: "pass" }] });
  } finally {
    await close(s, page);
  }
});
