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

/** sprich with REQ-030 building and REQ-032 queued after it, pressed in Build. */
async function building() {
  const s = await studio({
    homeRequirements: SPRICH as never,
    specgate: buildAnswers("claude -p < {prompt_file}"),
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
