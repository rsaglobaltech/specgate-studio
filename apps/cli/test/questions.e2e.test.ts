/**
 * draft-questions in a real browser: Questions lists every open question with
 * where it was asked and what it blocks (REQ-091); an answer goes through
 * `specgate answer` and the requirement stays blocked (REQ-092); "The spec
 * says it" runs `specgate answer --reviewed` and lifts it (REQ-093). The host
 * is fed by fakes; the desktop scenarios run the same bundle.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { close, open, studio, type Page } from "./support.js";

const Q1 = {
  id: "Q1",
  change: "draft-pedidos",
  text: "From what amount is shipping free?",
  blocks: ["REQ-034"],
  options: ["50 €", "100 €"],
  asked: "brief",
};
const AGENT = {
  id: "Q3",
  change: "draft-pedidos",
  text: "Is the invoice sent by email?",
  blocks: ["REQ-034"],
  options: [],
  asked: "build",
};
const home = () => [
  { id: "REQ-033", title: "Place an order", category: "DONE", needs: null },
  { id: "REQ-034", title: "Free shipping", category: "WAITING_FOR_ANSWER", needs: "an answer" },
];
/** sprich with draft-pedidos asking Q1 (and the agent's Q3), both blocking REQ-034. */
const sprich = (open: unknown[] = [Q1, AGENT]) =>
  studio({ questions: { open, answered: [] }, homeRequirements: home() });

const card = (id: string) => `.qcard[data-question="${id}"]`;
const text = async (page: Page, sel: string) => (await page.textContent(sel)) ?? "";

async function questions(page: Page) {
  await page.click('.sga[data-view="questions"]');
  await page.waitForSelector(".qcard");
}

test("REQ-091 SCN-271 SCN-272: Q1 with its change and REQ-034, and the agent's question beside it, marked as asked while it builds", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await questions(page);
    // Every open question in the side panel; the agent's in its own group (draft-design-conformance REQ-175).
    assert.deepEqual(
      await page.$$eval("button.qrow", (els) => els.map((e) => e.getAttribute("data-question"))),
      ["Q1", "Q3"],
    );
    const q1 = await text(page, card("Q1"));
    assert.match(q1, /Q1 From what amount is shipping free\?/);
    assert.match(q1, /From the brief · draft-pedidos/);
    assert.equal(
      await page.getAttribute(`${card("Q1")} .qreq`, "data-req"),
      "REQ-034",
      "REQ-034 is what it blocks",
    );
    assert.match(await text(page, `${card("Q1")} .qreq`), /REQ-034\s*Needs Clarification/);
    await page.click('button.qrow[data-question="Q3"]');
    await page.waitForSelector(card("Q3"));
    assert.equal(await page.getAttribute(`${card("Q3")} .qwhere`, "data-asked"), "build");
    assert.match(
      await text(page, card("Q3")),
      /Asked by the agent while it builds · draft-pedidos/,
    );
    assert.match(await text(page, `${card("Q3")} .qreq`), /REQ-034/);
    // Read from specgate's questions, nothing written.
    assert.deepEqual(s.runs, []);
    assert.deepEqual(s.writes, []);
    assert.ok(s.reads.includes("questions"));
  } finally {
    await close(s, page);
  }
});

test('REQ-092 SCN-273 SCN-274: Q1 answered "50 €" — `specgate answer`, Q1 waiting for "The spec says it", REQ-034 still blocked', async () => {
  const s = await sprich([Q1]);
  const page = await open(s);
  try {
    await questions(page);
    await page.click(`${card("Q1")} [data-option="50 €"]`);
    assert.deepEqual(s.runs, [], "choosing is not answering");
    await page.click(`${card("Q1")} [data-act="answer"]`);
    await page.waitForSelector('.notice[data-tone="ok"]');
    assert.deepEqual(s.runs, [["answer", "Q1", "50 €", "--change", "draft-pedidos"]]);
    assert.match(
      await text(page, '.notice [data-part="wrote"]'),
      /docs\/specs\/changes\/draft-pedidos\/questions\.md/,
    );
    await page.waitForSelector(`${card("Q1")}[data-state="answered"]`);
    const q1 = await text(page, card("Q1"));
    assert.match(q1, /Answer: 50 €/);
    assert.match(q1, /waiting for “The spec says it”/);
    assert.match(await text(page, `${card("Q1")} .qreq`), /REQ-034\s*Needs Clarification/);
    assert.deepEqual(s.writes, [], "the studio edited no file itself");
  } finally {
    await close(s, page);
  }
});

test('REQ-093 SCN-275 SCN-276: "The spec says it" on Q1 — `specgate answer Q1 --reviewed`, Q1 leaves the questions, REQ-034 unblocked, the notice names the command and its files', async () => {
  const s = await studio({
    questions: { open: [], answered: [{ ...Q1, answer: "50 €" }] },
    homeRequirements: home(),
  });
  const page = await open(s);
  try {
    await questions(page);
    await page.click(`${card("Q1")} [data-act="reviewed"]`);
    await page.waitForSelector('.notice[data-tone="ok"]');
    assert.deepEqual(s.runs, [["answer", "Q1", "--reviewed", "--change", "draft-pedidos"]]);
    assert.match(
      await text(page, '.notice [data-part="ran"]'),
      /specgate answer Q1 --reviewed --change draft-pedidos/,
    );
    const wrote = await text(page, '.notice [data-part="wrote"]');
    assert.match(wrote, /docs\/specs\/changes\/draft-pedidos\/questions\.md/);
    assert.match(wrote, /docs\/specs\/changes\/draft-pedidos\/assumptions\.md/);
    await page.waitForFunction((sel) => !document.querySelector(sel), card("Q1"));
    assert.match(await text(page, ".main"), /No question is open\./);
    // REQ-034 is no longer waiting: home was read again.
    assert.ok(s.reads.filter((r) => r === "home").length >= 2, `reads: ${s.reads.join(", ")}`);
    assert.deepEqual(s.writes, [], "the studio changed no requirement's text");
  } finally {
    await close(s, page);
  }
});

test('REQ-093: the "?" beside "The spec says it" explains `specgate answer Q1 --reviewed` and runs nothing', async () => {
  const s = await studio({
    questions: { open: [], answered: [{ ...Q1, answer: "50 €" }] },
    homeRequirements: home(),
  });
  const page = await open(s);
  try {
    await questions(page);
    await page.click(`${card("Q1")} .hq`);
    await page.waitForSelector('.help [data-action="answer-reviewed"]');
    assert.match(await text(page, ".help"), /specgate answer Q1 --reviewed --change draft-pedidos/);
    assert.match(await text(page, ".help"), /does not change a requirement's text/);
    assert.deepEqual(s.runs, []);
  } finally {
    await close(s, page);
  }
});
