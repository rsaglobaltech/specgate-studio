/**
 * Traceability in a real browser (draft-traceability REQ-121 … REQ-123), on
 * fakes: sprich's matrix as specgate 0.34.0 answers it — read again from the
 * files on disk, as specgate would — REQ-020 with SCN-020a and SCN-020b and a
 * test that names SCN-020a only (A1), REQ-031 blocked by Q2 with SCN-031a
 * tested and no code (A2). The agent's plan is recorded: no agent runs.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { close, open, untilTerm, type Page } from "./support.js";
import { audit } from "./audit.js";
import { COMPLETED, ID, REQUEST, SKELETON, TEST, withTrace } from "./trace-support.js";

const row = (scn: string) => `[data-testid="traceability-list"] .trow[data-scenario="${scn}"]`;
const cells = (page: Page, scn: string) =>
  page.$$eval(`${row(scn)} [role="cell"]`, (els) =>
    els.map((e) => (e as HTMLElement).innerText.trim()),
  );
const shownScenarios = (page: Page) =>
  page.$$eval('[data-testid="traceability-list"] .trow', (els) =>
    els.map((e) => e.getAttribute("data-scenario")),
  );

async function traceability(page: Page) {
  await page.click('.sga[data-view="traceability"]');
  await page.waitForSelector(row("SCN-020b"));
}

/** "Fix" pressed on SCN-020b: the editor at its scenario, the proposal in the panel. */
async function fix(page: Page) {
  await traceability(page);
  await page.click(`${row("SCN-020b")} [data-act="fix"]`);
  await page.waitForSelector('.proposal[data-step="skeleton"]');
}

test("REQ-121 SCN-361: on the desktop, Traceability shows two rows for REQ-020 — SCN-020a with its feature, test, code and Approved; SCN-020b with its feature, no test, marked as a gap", async () => {
  const s = await withTrace();
  const page = await open(s);
  try {
    await traceability(page);
    assert.deepEqual(await shownScenarios(page), ["SCN-010a", "SCN-020a", "SCN-020b", "SCN-031a"]);
    const a = await cells(page, "SCN-020a");
    assert.match(a[0]!, /^REQ-020/);
    assert.equal(a[1], "SCN-020a");
    assert.equal(a[2], "pagos/REQ-020.feature");
    assert.equal(a[3], "Cart.test.ts");
    assert.equal(a[4], "Cart.ts");
    assert.equal(a[5], "Approved");
    assert.equal(await page.$(`${row("SCN-020a")}[data-gap]`), null, "SCN-020a is no gap");
    const b = await cells(page, "SCN-020b");
    assert.match(b[0]!, /^REQ-020/);
    assert.equal(b[2], "pagos/REQ-020.feature");
    assert.equal(b[3], "— no test names it");
    assert.match(b[5]!, /^Approved\s*Lacks a test$/);
    assert.equal(await page.getAttribute(row("SCN-020b"), "data-gap"), "test");
    assert.equal(await page.textContent('[data-testid="trace-gaps"] .v'), "2");
  } finally {
    await close(s, page);
  }
});

test("REQ-121 SCN-362: in the browser, a second tab shows the same rows, SCN-020b a gap — from the host's memory, the matrix read once", async () => {
  const s = await withTrace();
  const first = await open(s);
  const second = await open(s, { lang: "es" });
  try {
    await traceability(first);
    await traceability(second);
    assert.deepEqual(await shownScenarios(second), await shownScenarios(first));
    assert.equal(await second.getAttribute(row("SCN-020b"), "data-gap"), "test");
    assert.equal((await cells(second, "SCN-020b"))[3], "— ninguna prueba lo nombra");
    assert.equal(s.reads.filter((r) => r === "matrix").length, 1, "read once, then from memory");
  } finally {
    await second.close();
    await close(s, first);
  }
});

test("REQ-122 SCN-363: on the desktop, the filter without a test — one row, SCN-020b, and the filter says it keeps 1 row", async () => {
  const s = await withTrace();
  const page = await open(s);
  try {
    await traceability(page);
    const chip = '.chip[data-filter="noTest"]';
    assert.equal(await page.textContent(chip), "Without a test · 1");
    assert.equal(await page.getAttribute(chip, "title"), "1 row");
    await page.click(chip);
    await page.waitForSelector(`${chip}[aria-pressed="true"]`);
    assert.deepEqual(await shownScenarios(page), ["SCN-020b"]);
  } finally {
    await close(s, page);
  }
});

test("REQ-122 SCN-364: in the browser, the filter waiting for an answer — REQ-031's rows, each naming Q2, and no row of a requirement no question blocks", async () => {
  const s = await withTrace();
  const page = await open(s, { lang: "es" });
  try {
    await traceability(page);
    assert.equal(await page.textContent('.chip[data-filter="waiting"]'), "Esperan respuesta · 1");
    await page.click('.chip[data-filter="waiting"]');
    await page.waitForSelector('.chip[data-filter="waiting"][aria-pressed="true"]');
    assert.deepEqual(await shownScenarios(page), ["SCN-031a"]);
    assert.equal(await page.getAttribute(row("SCN-031a"), "data-waiting"), "Q2");
    assert.match((await cells(page, "SCN-031a"))[5]!, /Needs Clarification · Q2/);
  } finally {
    await close(s, page);
  }
});

test("REQ-122 SCN-365: in the browser, the filter gaps — SCN-020b and SCN-031a, each saying what it lacks: a test, and code", async () => {
  const s = await withTrace();
  const page = await open(s);
  try {
    await traceability(page);
    assert.equal(await page.textContent('.chip[data-filter="gaps"]'), "Gaps · 2");
    await page.click('.chip[data-filter="gaps"]');
    await page.waitForSelector('.chip[data-filter="gaps"][aria-pressed="true"]');
    assert.deepEqual(await shownScenarios(page), ["SCN-020b", "SCN-031a"]);
    assert.equal(
      await page.textContent(`${row("SCN-020b")} [data-testid="trace-lacks"]`),
      "Lacks a test",
    );
    assert.equal(
      await page.textContent(`${row("SCN-031a")} [data-testid="trace-lacks"]`),
      "Lacks code",
    );
  } finally {
    await close(s, page);
  }
});

test('REQ-123 SCN-366: on the desktop, "Fix" on SCN-020b — the editor at SCN-020b of its feature, the proposal names test/pagos/REQ-020.test.ts with a skeleton naming REQ-020 and SCN-020b, one step per GIVEN, WHEN and THEN; no agent ran, no file changed', async () => {
  const s = await withTrace();
  const page = await open(s);
  try {
    const before = JSON.stringify(s.disk);
    await fix(page);
    await page.waitForFunction(
      () =>
        (window as any).__studio.monaco?.editor
          .getEditors()[0]
          ?.getModel()
          ?.uri.path.endsWith("features/pagos/REQ-020.feature") &&
        (window as any).__studio.monaco?.editor.getEditors()[0]?.getPosition()?.lineNumber === 10,
    );
    assert.equal(await page.getAttribute(".proposal", "data-path"), TEST);
    assert.equal(await page.textContent(".proposal .proposal-path"), TEST);
    const skeleton = (await page.textContent('[data-testid="proposal-skeleton"]'))!;
    assert.equal(skeleton, SKELETON);
    assert.match(skeleton, /REQ-020 SCN-020b: The empty cart/);
    for (const step of [
      "// GIVEN an empty cart",
      "// WHEN the customer opens the cart",
      "// THEN the customer sees that the cart is empty",
    ])
      assert.ok(skeleton.includes(step), step);
    assert.match((await page.textContent(".proposal-head"))!, /no agent · no cost/);
    assert.ok(!s.calls.some((c) => c[0] === "agent" && c[1] === "ask"), "no agent ran");
    assert.deepEqual(s.writes, []);
    assert.equal(JSON.stringify(s.disk), before, "no file of sprich changed");
  } finally {
    await close(s, page);
  }
});

test("REQ-123 SCN-367: in the browser, the proposal confirmed — test/pagos/REQ-020.test.ts written, SCN-020b no longer without a test, the notice names the file and specgate apply REQ-020", async () => {
  const s = await withTrace();
  const page = await open(s);
  try {
    await fix(page);
    await page.click('.proposal [data-act="confirm"]');
    await page.waitForSelector('.notice[data-tone="ok"]');
    const notice = (await page.textContent(".notice"))!;
    assert.match(notice, /test\/pagos\/REQ-020\.test\.ts/);
    assert.equal(
      await page.textContent('.notice [data-part="next"] .mono'),
      "specgate apply REQ-020",
    );
    assert.equal(s.disk[TEST], SKELETON, "written as proposed");
    assert.deepEqual(s.writes, [TEST]);
    await traceability(page);
    await page.waitForFunction(
      (sel) => !document.querySelector(sel)?.hasAttribute("data-gap"),
      row("SCN-020b"),
    );
    assert.equal((await cells(page, "SCN-020b"))[3], "REQ-020.test.ts");
    assert.equal(await page.textContent('.chip[data-filter="noTest"]'), "Without a test · 0");
  } finally {
    await close(s, page);
  }
});

test("REQ-123 SCN-368: on the desktop, the proposal cancelled — no file written, SCN-020b still a gap, the notice says nothing was written", async () => {
  const s = await withTrace();
  const page = await open(s, { lang: "es" });
  try {
    const before = JSON.stringify(s.disk);
    await fix(page);
    await page.click('.proposal [data-act="cancel"]');
    await page.waitForSelector('.notice[data-tone="ok"]');
    assert.match((await page.textContent('.notice [data-part="wrote"]'))!, /No se escribió nada/);
    assert.match((await page.textContent('.notice [data-part="ran"]'))!, /SCN-020b/);
    assert.equal(await page.$(".proposal"), null, "the proposal goes");
    assert.deepEqual(s.writes, []);
    assert.equal(JSON.stringify(s.disk), before);
    await traceability(page);
    assert.equal(await page.getAttribute(row("SCN-020b"), "data-gap"), "test");
  } finally {
    await close(s, page);
  }
});

test('REQ-123 SCN-369: in the browser, "Ask the agent" — the agent\'s test as a diff against the skeleton, with its cost; test/pagos/REQ-020.test.ts not written until confirmed, then written by specgate', async () => {
  const s = await withTrace();
  const page = await open(s);
  try {
    await fix(page);
    await page.click('.proposal [data-act="ask-agent"]');
    await page.waitForSelector('.proposal[data-step="agent"]');
    assert.ok(
      s.calls.some((c) => c.join(" ") === `agent ask ${REQUEST} --plan`),
      "the project's agent, through specgate's agent ask --plan",
    );
    assert.equal(await page.textContent('[data-testid="proposal-usage"]'), "2.5 k tokens · $0.03");
    const del = await page.$$eval('[data-testid="proposal-diff"] .del', (els) =>
      els.map((e) => e.textContent),
    );
    const add = await page.$$eval('[data-testid="proposal-diff"] .add', (els) =>
      els.map((e) => e.textContent),
    );
    assert.equal(del.length, 1);
    assert.match(del[0]!, /^-  assert\.fail\(/);
    assert.deepEqual(add, ["+  const cart = openCart([]);", "+  assert.equal(cart.empty, true);"]);
    assert.equal(s.disk[TEST], undefined, "not written before the confirmation");
    assert.ok(!s.calls.some((c) => c[1] === "apply"));
    await page.click('.proposal [data-act="confirm-agent"]');
    await page.waitForSelector('.notice[data-tone="ok"] >> text=specgate apply REQ-020');
    assert.match((await page.textContent(".notice"))!, /test\/pagos\/REQ-020\.test\.ts/);
    assert.equal(s.disk[TEST], COMPLETED, "written by specgate as the diff showed");
    assert.deepEqual(s.writes, [], "never by the studio");
    await untilTerm(page, "specgate", new RegExp(`specgate agent apply ${ID}`));
  } finally {
    await close(s, page);
  }
});

test('REQ-123: the "?" beside Fix and Ask the agent, in Spanish — what each does, its command and the file, and that nothing is written before confirming', async () => {
  const s = await withTrace();
  const page = await open(s, { lang: "es" });
  try {
    await fix(page);
    await page.click('.proposal .hq[aria-label="Qué hace Arreglar"]');
    await page.waitForSelector('.help.popover section[data-action="trace-fix"]');
    const fixHelp = (await page.textContent(".help.popover"))!;
    assert.match(fixHelp, /Ninguno: el studio escribe el esqueleto/);
    assert.match(fixHelp, /test\/pagos\/REQ-020\.test\.ts, y solo cuando confirmas/);
    await page.keyboard.press("Escape");
    await page.click('.proposal .hq[aria-label="Qué hace Pedir al agente"]');
    await page.waitForSelector('.help.popover section[data-action="trace-ask-agent"]');
    assert.match((await page.textContent(".help.popover"))!, /specgate agent ask/);
    await page.keyboard.press("Escape");
    await page.click('.sga[data-view="traceability"]');
    await page.click(".trace-head .hq");
    await page.waitForSelector('.help.popover section[data-action="traceability"]');
    assert.match((await page.textContent(".help.popover"))!, /specgate matrix --json --dry-run/);
  } finally {
    await close(s, page);
  }
});

for (const [w, h] of [
  [1440, 900],
  [1280, 800],
] as const)
  test(`REQ-121 REQ-123 REQ-202: Traceability and the proposal at ${w}×${h} — nothing over anything, no dead column, no sideways scroll`, async () => {
    const s = await withTrace();
    const page = await open(s, { lang: "es" });
    try {
      await page.setViewportSize({ width: w, height: h });
      await traceability(page);
      assert.deepEqual(await audit(page), []);
      await fix(page);
      assert.deepEqual(await audit(page), []);
    } finally {
      await close(s, page);
    }
  });
