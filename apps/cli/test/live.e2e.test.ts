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

test("REQ-103 SCN-305: Live on the desktop during REQ-030 — its finished steps with their times, the running step, the output growing, REQ-032 queued, cost and tokens", async () => {
  const { s, page, e } = await building();
  try {
    await live(page);
    assert.match(await text(page, '[data-testid="live-building"]'), /Building REQ-030/);
    const steps = await page.$$eval('.lreq[data-req="REQ-030"] .lstep', (rows) =>
      rows.map((r) => [
        r.getAttribute("data-kind"),
        r.querySelectorAll("td")[1]!.textContent,
        r.querySelector(".ltime")!.textContent,
        r.getAttribute("data-result"),
      ]),
    );
    assert.deepEqual(steps.slice(0, 2), [
      ["write", "test/cancel.test.ts", "12.3 s", "ok"],
      ["gate", "validate --strict", "1.2 s", "pass"],
    ]);
    const [kind, label, time, result] = steps[2]!;
    assert.deepEqual([kind, label, result], ["gate", "test command: npm test", "running"]);
    assert.match(time!, /^running \d+ s$/, "the current step, timed from its start");
    assert.deepEqual(
      await page.$$eval('[data-testid="live-queue"] li', (els) => els.map((e) => e.textContent)),
      ["REQ-032"],
    );
    assert.equal(
      await page.getAttribute('[data-testid="live-cost"] [data-cost]', "data-cost"),
      "0.42",
    );
    assert.match(await text(page, '[data-testid="live-cost"]'), /\$0\.42/);
    assert.match(
      await text(page, '[data-testid="live-tokens"]'),
      /12,000 in · 1,500 out · 30,000 from cache/,
    );
    assert.match(
      await text(page, '[data-testid="live-output"]'),
      /Reading the scenario of REQ-030/,
    );

    // The agent writes on: Live grows without a reload.
    e({ type: "message", text: "The test fails as expected; writing the code" });
    await page.waitForSelector('[data-testid="live-output"] li:has-text("writing the code")');
    // The running step's time counts on.
    await page.waitForFunction(() =>
      /running [1-9]\d* s/.test(
        document.querySelector('.lstep[data-result="running"] .ltime')?.textContent ?? "",
      ),
    );
    assert.equal(s.harness.started.length, 1, "REQ-032 waits in the queue");
  } finally {
    await close(s, page);
  }
});

test("REQ-103 SCN-306: Live opened in a second browser tab mid-build — the same steps, the output so far and from then on, the queue, cost and tokens", async () => {
  const { s, page, e } = await building();
  const second = await open(s, { lang: "es" });
  try {
    await live(page);
    await live(second);
    const steps = (p: Page) =>
      p.$$eval('.lreq[data-req="REQ-030"] .lstep', (rows) =>
        rows.map((r) => [r.getAttribute("data-kind"), r.getAttribute("data-result")]),
      );
    assert.deepEqual(await steps(second), await steps(page));
    assert.match(
      await text(second, '[data-testid="live-output"]'),
      /Reading the scenario of REQ-030/,
    );
    assert.deepEqual(
      await second.$$eval('[data-testid="live-queue"] li', (els) => els.map((e) => e.textContent)),
      ["REQ-032"],
    );
    assert.match(await text(second, '[data-testid="live-cost"]'), /\$0\.42/);
    assert.match(await text(second, '[data-testid="live-tokens"]'), /12\.000 de entrada/);

    // From then on, both tabs see what the agent writes.
    e({ type: "gate", stage: "test command: npm test", result: "pass", ms: 7000 });
    for (const p of [page, second])
      await p.waitForSelector(
        '[data-testid="live-output"] li:has-text("gate test command: npm test: pass")',
      );
  } finally {
    await second.close();
    await close(s, page);
  }
});

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
    s.events.append("REQ-032", { attempt: 1, type: "message", text: "Refunding the order" });
    await page.waitForSelector(
      '[data-testid="live-output"] li[data-req="REQ-032"]:has-text("Refunding the order")',
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

test("REQ-105 SCN-309: Stop now on the desktop — confirmed, the build stopped and its processes ended; cancelled, nothing stops", async () => {
  const { s, page } = await building();
  try {
    await live(page);
    await page.click('.lstop [data-act="stop-now"]');
    await page.waitForSelector('[data-confirm="stop-now"]');
    assert.match(await text(page, '[data-confirm="stop-now"]'), /Stop the build of REQ-030 now\?/);
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
    await page.waitForSelector('.notice[data-tone]:has-text("every process it started")');
  } finally {
    await close(s, page);
  }
});

test("REQ-105 SCN-310: Stop after this requirement in the browser — REQ-030 finishes, REQ-032 does not start", async () => {
  const { s, page } = await building();
  try {
    await live(page);
    await page.click('.lstop [data-act="stop-after"]');
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

test("REQ-103: Live during REQ-030 from `harness run --format jsonl` as it streams — the step and the agent's output before any events file says them", async () => {
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
    await page.waitForSelector('.lreq[data-req="REQ-030"] .lstep[data-kind="write"]');
    await page.waitForSelector('[data-kind="output"] >> text=Writing the test of SCN-030a');
    s.harness.finish(0, { results: [{ requirement: "REQ-030", result: "pass" }] });
  } finally {
    await close(s, page);
  }
});
