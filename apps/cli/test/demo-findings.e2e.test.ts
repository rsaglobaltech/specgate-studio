/**
 * demo-findings in a real browser: what the demo of REQ-141 showed wrong.
 * Build lists what is ready to close, with "Aplicar" (REQ-101); each queued
 * run is echoed with its own button, and "Rama creada" is not charged with
 * the wait (REQ-103); what the agent spent reads as usage, its dollars
 * "≈ precio de API" unless the Developer pays per use (REQ-211).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { MOD, close, open, studio, untilTerm, type Page } from "./support.js";
import { PLAN, SETTINGS, buildAnswers } from "./build-support.js";

const text = async (page: Page, sel: string) => (await page.textContent(sel)) ?? "";
const parts = (page: Page) =>
  page.$$eval(".help [data-part]", (els) =>
    els.map((e) => [e.querySelector("dt")?.textContent, e.querySelector("dd")?.textContent]),
  );

/** After the run of REQ-141: REQ-142 and REQ-143 with their tests in place (`specgate status`). */
const AFTER_141 = [
  { id: "REQ-139", title: "Done before", category: "DONE", needs: null },
  {
    id: "REQ-141",
    title: "A settings editor with search, and two scopes: project and user",
    category: "DONE",
    needs: null,
  },
  {
    id: "REQ-142",
    title: "Each project setting says which `specgate config set` command and file it uses",
    category: "NEEDS_STATUS_UPDATE",
    needs: "its test is in place",
  },
  {
    id: "REQ-143",
    title: "The sections: agents and profiles, preferences",
    category: "NEEDS_STATUS_UPDATE",
    needs: "its test is in place",
  },
  {
    id: "REQ-131",
    title: "Built of the total, scenarios proven, coverage",
    category: "NEEDS_EVERYTHING",
    needs: "a test and code",
  },
];

const closeRow = (req: string) => `.breqs[data-group="close"] .breq[data-req="${req}"]`;

test('REQ-101 SCN-631: on the desktop after REQ-141\'s run, REQ-142 and REQ-143 under "Listos para cerrar", each with "Aplicar" and its "?", not among what is ready', async () => {
  const s = await studio({
    homeRequirements: AFTER_141 as never,
    specgate: { ...buildAnswers("claude -p < {prompt_file}"), plan: PLAN },
  });
  const page = await open(s, { lang: "es" });
  try {
    await page.click('.sga[data-view="build"]');
    await page.waitForSelector(closeRow("REQ-143"));
    assert.match(await text(page, '[data-testid="build-close-group"]'), /Listos para cerrar/);
    for (const req of ["REQ-142", "REQ-143"]) {
      assert.equal(await text(page, `${closeRow(req)} [data-act="apply"]`), "Aplicar");
      assert.equal(await page.locator(`${closeRow(req)} .hq`).count(), 1, `${req}'s "?"`);
      assert.equal(await page.$(`.breqs[data-group="ready"] .breq[data-req="${req}"]`), null);
    }
    assert.ok(await page.$('.breqs[data-group="ready"] .breq[data-req="REQ-131"]'));
    assert.deepEqual(s.runs, [], "nothing ran");
  } finally {
    await close(s, page);
  }
});

test('REQ-101 SCN-632: in the browser, "Aplicar" on REQ-142 — its "?" names `specgate apply REQ-142`, then the echo "Aplicar REQ-142" and its notice', async () => {
  const s = await studio({
    homeRequirements: AFTER_141 as never,
    specgate: { ...buildAnswers("claude -p < {prompt_file}"), plan: PLAN },
  });
  const page = await open(s, { lang: "es" });
  try {
    await page.click('.sga[data-view="build"]');
    await page.waitForSelector(closeRow("REQ-142"));
    await page.click(`${closeRow("REQ-142")} .hq`);
    await page.waitForSelector('.help [data-part="next"]');
    const p = await parts(page);
    assert.equal(p[1]![1], "specgate apply REQ-142");
    assert.deepEqual(s.runs, [], "the ? runs nothing");
    await page.keyboard.press("Escape");
    await page.waitForSelector(".help", { state: "detached" });
    await page.click(`${closeRow("REQ-142")} [data-act="apply"]`);
    await untilTerm(page, "specgate", /▶ "Aplicar REQ-142" · specgate apply REQ-142/);
    await page.waitForSelector('.notice[data-tone="ok"]');
    assert.match(await text(page, ".notice"), /pasó el gate y marcó REQ-142 como Implementado/);
    assert.deepEqual(s.runs, [["apply", "REQ-142"]]);
  } finally {
    await close(s, page);
  }
});

test('REQ-103 SCN-633: on the desktop, "Construir REQ-142" then "Construir REQ-143" queued behind REQ-141 — each run echoed with its own button', async () => {
  const s = await studio({
    homeRequirements: [
      ...SETTINGS,
      {
        id: "REQ-143",
        title: "The sections: agents and profiles, preferences",
        category: "NEEDS_EVERYTHING",
        needs: "a test and code",
      },
    ] as never,
    specgate: { ...buildAnswers("claude -p < {prompt_file}"), plan: PLAN },
  });
  const page = await open(s, { lang: "es" });
  try {
    await page.click('.sga[data-view="build"]');
    await page.waitForSelector('.breq[data-req="REQ-143"]');
    for (const req of ["REQ-141", "REQ-142", "REQ-143"]) {
      await page.click(`.breq[data-req="${req}"] [data-act="build"]`);
      await page.waitForSelector(`.bstarted[data-req="${req}"]`);
    }
    await untilTerm(page, "specgate", /▶ "Construir REQ-141" · specgate harness run --req REQ-141/);
    s.harness.finish(0, { results: [{ requirement: "REQ-141", result: "pass" }] });
    await untilTerm(page, "specgate", /▶ "Construir REQ-142" · specgate harness run --req REQ-142/);
    s.harness.finish(0, { results: [{ requirement: "REQ-142", result: "pass" }] });
    const term = await untilTerm(
      page,
      "specgate",
      /▶ "Construir REQ-143" · specgate harness run --req REQ-143/,
    );
    assert.doesNotMatch(term, /"Construir REQ-14[23]" · specgate harness run --req REQ-141/);
    assert.doesNotMatch(term, /"Construir REQ-143" · specgate harness run --req REQ-142/);
    s.harness.finish(0, { results: [{ requirement: "REQ-143", result: "pass" }] });
  } finally {
    await close(s, page);
  }
});

/** REQ-141 pressed `ago` seconds ago; the host's clock set back for the press. */
async function pressed(ago: number, lang: "en" | "es", over: Parameters<typeof studio>[0] = {}) {
  const s = await studio({
    homeRequirements: SETTINGS as never,
    specgate: { ...buildAnswers("claude -p < {prompt_file}"), plan: PLAN },
    ...over,
  });
  const page = await open(s, { lang });
  await page.click('.sga[data-view="build"]');
  await page.waitForSelector('.breq[data-req="REQ-141"]');
  const real = Date.now;
  const at = real() / 1000 - ago;
  Date.now = () => at * 1000;
  try {
    await page.click('.breq[data-req="REQ-141"] [data-act="build"]');
    await page.waitForSelector('.bstarted[data-req="REQ-141"]');
  } finally {
    Date.now = real;
  }
  return { s, page, at };
}

test('REQ-103 SCN-634: in the browser, specgate\'s first event 33 s after the turn — "Rama creada ✓ —", not "33 s"; the setup with its own time', async () => {
  const { s, page, at } = await pressed(60, "es");
  try {
    const setup = "setup: npm ci --silent --no-audit --no-fund";
    s.events.append("REQ-141", { t: at + 33, type: "gate-start", stage: setup });
    s.events.append("REQ-141", {
      t: at + 37.5,
      type: "gate",
      stage: setup,
      result: "pass",
      ms: 4496,
    });
    await page.click('.sga[data-view="live"]');
    await page.waitForSelector('.lstep[data-kind="setup"][data-result="done"]');
    const branch = '.lreq[data-req="REQ-141"] .lstep[data-kind="branch"]';
    assert.equal(await page.getAttribute(branch, "data-result"), "done");
    assert.equal(await text(page, `${branch} .ltime`), "—");
    assert.equal(
      await text(page, '.lreq[data-req="REQ-141"] .lstep[data-kind="setup"] .ltime'),
      "4,5 s",
    );
  } finally {
    await close(s, page);
  }
});

/** REQ-141 built: 182 k tokens in 120 turns, Claude Code reporting $1.10 (the demo's figures, scaled). */
const BUILT = {
  t: 0,
  attempt: 1,
  type: "usage",
  final: true,
  input: 156,
  output: 63_684,
  cacheRead: 115_785,
  cacheWrite: 2_010,
  cost: 1.1,
  turns: 120,
};
const REPORT = {
  data: {
    report: {
      runs: 1,
      passed: 1,
      msPerDelivered: 540_000,
      estimatedCost: null,
      measuredCost: { total: 1.1, covered: 1, uncovered: 0 },
      costByProfile: [
        {
          profile: "agent",
          tokens: { input: 156, output: 63_684, cacheRead: 115_785, cacheWrite: 2_010 },
        },
      ],
    },
  },
  findings: [],
  exitCode: 0,
};

async function built(lang: "en" | "es") {
  const s = await studio({
    homeRequirements: AFTER_141 as never,
    specgate: {
      ...buildAnswers("claude -p < {prompt_file}"),
      plan: PLAN,
      "harness report": REPORT,
    },
  });
  const t = Date.now() / 1000 - 600;
  s.events.append("REQ-141", { t, attempt: 1, type: "attempt", state: "start" });
  s.events.append("REQ-141", { ...BUILT, t: t + 500 });
  s.events.append("REQ-141", { t: t + 540, attempt: 1, type: "attempt", state: "end", result: "pass" });
  const page = await open(s, { lang });
  return { s, page };
}

test('REQ-211 SCN-635: on the desktop on a subscription — "Uso" with the tokens and "≈ 1,10 $ precio de API" in the status bar, Home and Live; "Coste" in none', async () => {
  const { s, page } = await built("es");
  try {
    const bar = '[data-testid="status-cost"]';
    await page.waitForFunction(
      (sel) => /182 k tokens/.test(document.querySelector(sel)?.textContent ?? ""),
      bar,
    );
    assert.equal(await text(page, bar), "Uso 182 k tokens · ≈ 1,10 $ precio de API");

    await page.click('.sga[data-view="home"]');
    await page.waitForSelector('[data-testid="home-usage"] .v');
    await page.waitForFunction(() =>
      /precio de API/.test(document.querySelector('[data-testid="home-usage"]')?.textContent ?? ""),
    );
    const home = await page.innerText('[data-testid="home-usage"]');
    assert.match(home, /Uso del agente/);
    assert.match(home, /182 k tokens/);
    assert.match(home, /≈ 1,10 \$ precio de API/);

    await page.click('.sga[data-view="live"]');
    await page.waitForSelector('[data-finished="REQ-141"]');
    const header = await text(page, '[data-testid="live-cost"]');
    assert.match(header, /182 k tokens · 120 turnos · ≈ 1,10 \$ precio de API/);
    assert.match(await text(page, '[data-finished="REQ-141"]'), /182 k tokens · ≈ 1,10 \$/);

    const all = await page.innerText("body");
    assert.doesNotMatch(all, /Coste/);
  } finally {
    await close(s, page);
  }
});

test('REQ-211 SCN-636: in the browser in English, "Billing: pay per use of the API" — its "?" runs nothing, then its notice and "Cost $1.10", no "API price"', async () => {
  const { s, page } = await built("en");
  try {
    const bar = '[data-testid="status-cost"]';
    await page.waitForFunction(
      (sel) => /API price/.test(document.querySelector(sel)?.textContent ?? ""),
      bar,
    );
    await page.keyboard.press(`${MOD}+Shift+P`);
    await page.keyboard.type("pay per use");
    await page.click('.palette li .hq[aria-label="What does “Billing: pay per use of the API” do?"]');
    await page.waitForSelector('.help [data-part="next"]');
    const p = await parts(page);
    assert.match(p[0]![1]!, /label/i);
    assert.match(p[1]![1]!, /None/);
    assert.deepEqual(s.runs, [], "the ? runs nothing");
    await page.keyboard.press("Escape");
    await page.waitForSelector(".help", { state: "detached" });

    await page.keyboard.press(`${MOD}+Shift+P`);
    await page.keyboard.type("pay per use");
    await page.waitForSelector('.palette li:has-text("Billing: pay per use of the API")');
    await page.keyboard.press("Enter");
    await page.waitForSelector('.notice[data-tone="ok"]');
    assert.match(await text(page, ".notice"), /pay per use/i);
    await page.waitForFunction(
      (sel) => /Cost \$1\.10/.test(document.querySelector(sel)?.textContent ?? ""),
      bar,
    );
    assert.equal(await text(page, bar), "Cost $1.10 · 182 k tokens");
    await page.click('.sga[data-view="live"]');
    await page.waitForSelector('[data-finished="REQ-141"]');
    assert.match(await text(page, '[data-testid="live-cost"]'), /Cost \$1\.10/);
    assert.doesNotMatch(await page.innerText("body"), /API price/);
    assert.deepEqual(s.runs, [], "no command ran");
  } finally {
    await close(s, page);
  }
});
