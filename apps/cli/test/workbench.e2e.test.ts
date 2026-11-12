/**
 * draft-workbench in a real browser: `specgate-studio serve` with the UI
 * bundle, the host fed by fakes so the test reads no real project (REQ-031 …
 * REQ-036). The desktop scenarios run the same bundle; the Tauri window comes
 * with phase 3.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  MOD,
  PERF,
  browser,
  close,
  hidePanel,
  open,
  showPanel,
  studio,
  type Page,
  openFromExplorer,
} from "./support.js";

const activityLabels = (page: Page) =>
  page.$$eval(".activity .sga", (els) => els.map((e) => e.getAttribute("aria-label")));
const current = (page: Page) =>
  page.$eval('.activity .sga[aria-current="page"]', (e) => e.getAttribute("aria-label"));
const ELEVEN = [
  "Home",
  "Explorer",
  "Brief",
  "Changes",
  "Questions",
  "Build",
  "Live",
  "Traceability",
  "Report",
  "Help",
  "Settings",
];

// ── REQ-031 ─────────────────────────────────────────────────────────────

test("REQ-031 SCN-091: Changes opened from the activity bar — the eleven views in order, Changes marked", async () => {
  const s = await studio();
  const page = await open(s);
  try {
    await page.click('.sga[data-view="changes"]');
    assert.deepEqual(await activityLabels(page), ELEVEN);
    assert.equal(await current(page), "Changes");
    // Help and Settings sit at the bottom, after the spacer.
    const at = await page.evaluate(() => {
      const nav = document.querySelector(".activity")!.getBoundingClientRect();
      const b = [...document.querySelectorAll(".activity .sga")].map((e) =>
        e.getBoundingClientRect(),
      );
      return {
        navBottom: nav.bottom,
        report: b[8]!.bottom,
        help: b[9]!.top,
        settings: b[10]!.bottom,
      };
    });
    assert.ok(at.navBottom - at.settings <= 12, "Settings sits at the bottom of the bar");
    assert.ok(at.help > at.report, "Help comes after Report, below the spacer");
  } finally {
    await close(s, page);
  }
});

test("REQ-031 SCN-092: Report opened in the browser — the same eleven views as on Home, Report marked", async () => {
  const s = await studio();
  const page = await open(s);
  try {
    const onHome = await activityLabels(page);
    assert.equal(await current(page), "Home");
    await page.click('.sga[data-view="report"]');
    assert.deepEqual(await activityLabels(page), onHome);
    assert.deepEqual(onHome, ELEVEN);
    assert.equal(await current(page), "Report");
  } finally {
    await close(s, page);
  }
});

test("REQ-031 SCN-092: Report counts the requirements Home counts — open changes' included", async () => {
  // Found by the design audit: Report read `report --json`'s total, which
  // leaves out the requirements of open changes, and said 1 where Home said 3.
  const s = await studio({ rows: 3, sections: { report: { total: 1 } } });
  const page = await open(s);
  try {
    await page.click('.sga[data-view="report"]');
    await page.waitForSelector('[data-testid="report-total"]');
    assert.equal(await page.textContent('[data-testid="report-total"]'), "3");
    assert.match(
      (await page.textContent('[data-testid="report-split"]')) ?? "",
      /1 in the spec · 2 in open changes/,
    );
  } finally {
    await close(s, page);
  }
});

// ── REQ-032 ─────────────────────────────────────────────────────────────

test("REQ-032 SCN-093: sprich on feat/mvp-fase-1 — the status bar shows the branch, no ticket, the gate, done of the total, the cost; the panel's five tabs", async () => {
  const s = await studio({ branch: "feat/mvp-fase-1" });
  const page = await open(s);
  try {
    await page.waitForFunction(
      () => document.querySelector('[data-testid="status-progress"]')?.textContent === "13 of 14",
    );
    assert.equal(await page.textContent('[data-testid="status-gate"]'), "Gate not run");
    assert.match((await page.textContent('[data-testid="status-cost"]')) ?? "", /Cost \$0\.00/);
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="status-branch"]')?.textContent ===
        "⎇ feat/mvp-fase-1",
    );
    assert.equal(await page.textContent('[data-testid="status-ticket"]'), "no ticket");
    assert.deepEqual(await page.$$eval(".ptab", (els) => els.map((e) => e.textContent)), [
      "Terminal",
      "Gate",
      "Problems",
      "Agent output",
      "Traceability",
    ]);
  } finally {
    await close(s, page);
  }
});

test("REQ-032: a branch that names a ticket — the status bar shows the ticket and its team", async () => {
  const s = await studio({ branch: "feature/parking/KAN-13" });
  const page = await open(s);
  try {
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="status-ticket"]')?.textContent === "KAN-13 · parking",
    );
    assert.equal(
      await page.textContent('[data-testid="status-branch"]'),
      "⎇ feature/parking/KAN-13",
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-032 SCN-094: brief.md open, then proposal.md from Explorer — two tabs, proposal.md active", async () => {
  const s = await studio();
  const page = await open(s);
  try {
    await openFromExplorer(page, "docs/brief.md");
    await openFromExplorer(page, "docs/specs/changes/draft-workbench/proposal.md");
    assert.deepEqual(
      await page.$$eval(".tab", (els) => els.map((e) => e.firstChild?.textContent)),
      ["brief.md", "proposal.md"],
    );
    assert.equal(
      await page.$eval('.tab[aria-selected="true"]', (e) => e.firstChild?.textContent),
      "proposal.md",
    );
    await page.waitForFunction(() =>
      // The file is shown — by Monaco once it has loaded, or as text until then.
      (document.querySelector('.content[data-view="file"]')?.textContent ?? "").includes(
        "draft-workbench/proposal.md",
      ),
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-032 SCN-103: the panel hidden, two tabs — Mod+J shows the panel, Ctrl+Shift+Tab makes brief.md active", async () => {
  const s = await studio();
  const page = await open(s);
  try {
    await hidePanel(page);
    assert.equal(
      await page.$eval(".panel", (e) => e.hasAttribute("data-collapsed")),
      true,
      "hidden first",
    );
    await openFromExplorer(page, "docs/brief.md");
    await openFromExplorer(page, "docs/specs/changes/draft-workbench/proposal.md");
    await page.keyboard.press(`${MOD}+J`);
    await page.keyboard.press("Control+Shift+Tab");
    assert.equal(await page.$eval(".panel", (e) => e.hasAttribute("data-collapsed")), false);
    assert.equal(
      await page.$eval('.tab[aria-selected="true"]', (e) => e.firstChild?.textContent),
      "brief.md",
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-032: the essential shortcuts answer — Mod+, opens Settings, Mod+Shift+E Explorer, Ctrl+` the terminal, Mod+W closes the tab", async () => {
  const s = await studio();
  const page = await open(s);
  try {
    await page.keyboard.press(`${MOD}+Comma`);
    assert.equal(await current(page), "Settings");
    await page.keyboard.press(`${MOD}+Shift+E`);
    assert.equal(await current(page), "Explorer");
    await showPanel(page);
    await page.click('.ptab:has-text("Gate")');
    await page.keyboard.press("Control+Backquote");
    assert.equal(await page.$eval('.ptab[aria-selected="true"]', (e) => e.textContent), "Terminal");
    await page.click('.row[title="spec.md"]');
    assert.equal(await page.$$eval(".tab", (els) => els.length), 1);
    await page.keyboard.press(`${MOD}+W`);
    assert.equal(await page.$$eval(".tab", (els) => els.length), 0);
    await page.keyboard.press(`${MOD}+P`);
    assert.equal(
      await page.$$eval(".palette li", (els) => els.length),
      3,
      "open a file lists the project's files",
    );
  } finally {
    await close(s, page);
  }
});

// ── REQ-033 ─────────────────────────────────────────────────────────────

test('REQ-033 SCN-095: Ctrl+Shift+P, "ticket", Enter — "Open a change from a ticket" opens', async () => {
  const s = await studio();
  const page = await open(s);
  try {
    await page.keyboard.press(`${MOD}+Shift+P`);
    await page.keyboard.type("ticket");
    await page.keyboard.press("Enter");
    await page.waitForSelector('section[aria-label="Open a change from a ticket"]');
    assert.equal(await current(page), "Changes");
    assert.equal(await page.$$eval(".palette", (els) => els.length), 0, "the palette closed");
  } finally {
    await close(s, page);
  }
});

test('REQ-033 SCN-096: the palette lists "Open a change from a ticket" with `specgate propose --from-ticket <KEY>` beside it', async () => {
  const s = await studio();
  const page = await open(s);
  try {
    await page.keyboard.press(`${MOD}+Shift+P`);
    await page.keyboard.type("ticket");
    const first = await page.$eval(".palette li", (e) =>
      [...e.querySelectorAll("span")].map((x) => x.textContent),
    );
    assert.deepEqual(first, [
      "Open a change from a ticket",
      "specgate propose --from-ticket <KEY>",
    ]);
    // F1 opens it too (A9); Escape closes it.
    await page.keyboard.press("Escape");
    await page.keyboard.press("F1");
    await page.waitForSelector(".palette");
    // The palette stays dark in the light theme (the canvas's dark palette).
    await page.evaluate(() => (document.documentElement.dataset.theme = "light"));
    assert.equal(
      await page.$eval(".palette", (e) => getComputedStyle(e).backgroundColor),
      "rgb(28, 29, 34)",
    );
  } finally {
    await close(s, page);
  }
});

test('REQ-033: "Check the gate" from the palette runs `specgate check` and the status bar follows it', async () => {
  const s = await studio();
  const page = await open(s);
  try {
    await page.keyboard.press(`${MOD}+Shift+P`);
    await page.keyboard.type("check the gate");
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => document.querySelector('[data-testid="status-gate"]')?.textContent === "Gate passed",
    );
    assert.deepEqual(s.runs, [["check"]]);
    // The Gate tab keeps the run's output (the terminal echoes it too: draft-terminal REQ-053).
    await page.click('.ptab:has-text("Gate")');
    assert.match((await page.textContent(".pbody")) ?? "", /\$ specgate check[\s\S]*exit 0/);
  } finally {
    await close(s, page);
  }
});

// ── REQ-034 ─────────────────────────────────────────────────────────────

test("REQ-034 SCN-097: Spanish on Cambios, English chosen — the view is Changes, the bar reads English, sprich is not read again", async () => {
  const s = await studio();
  const page = await open(s, { lang: "es" });
  try {
    await page.click('.sga[data-view="changes"]');
    assert.equal(await page.textContent(".content h1"), "Cambios");
    await page.waitForFunction(
      () => document.querySelector('[data-testid="status-progress"]')?.textContent === "13 de 14",
    );
    // Cambios reads its changes once when it opens (draft-changes): that read is
    // the view's, not the language's, so it is in before the count starts.
    await page.waitForFunction(
      () =>
        ((window as never as { __studio: { rpc: { sent: Record<string, number> } } }).__studio.rpc
          .sent["changes.get"] ?? 0) >= 1,
    );
    const readsBefore = s.reads.length;
    const sentBefore = await page.evaluate(() => ({
      ...(window as never as { __studio: { rpc: { sent: Record<string, number> } } }).__studio.rpc
        .sent,
    }));
    // From the palette, staying on Cambios…
    await page.keyboard.press(`${MOD}+Shift+P`);
    await page.keyboard.type("idioma");
    await page.keyboard.press("Enter");
    assert.equal(await page.textContent(".content h1"), "Changes");
    assert.deepEqual(await activityLabels(page), ELEVEN);
    // …and from Settings, back and forth.
    await page.click('.sga[data-view="settings"]');
    await page.selectOption('select[aria-label="Language"]', "es");
    assert.equal(await page.textContent(".content h1"), "Configuración");
    await page.selectOption('select[aria-label="Idioma"]', "en");
    assert.equal(await page.textContent(".content h1"), "Settings");
    assert.equal(s.reads.length, readsBefore, "the host read nothing again");
    const sentAfter = await page.evaluate(
      () =>
        (window as never as { __studio: { rpc: { sent: Record<string, number> } } }).__studio.rpc
          .sent,
    );
    assert.deepEqual(sentAfter, sentBefore, "the UI asked nothing again");
  } finally {
    await close(s, page);
  }
});

test("REQ-034 SCN-098: first time in the browser — dark; light turns the activity bar, the content and the panels light at once", async () => {
  const s = await studio();
  const page = await open(s);
  try {
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
    await page.click('.sga[data-view="settings"]');
    assert.equal(
      await page.$eval('select[aria-label="Theme"]', (e) => (e as HTMLSelectElement).value),
      "dark",
    );
    const bg = () =>
      page.evaluate(() =>
        [".activity", ".content", ".panel", ".status"].map(
          (sel) => getComputedStyle(document.querySelector(sel)!).backgroundColor,
        ),
      );
    const dark = await bg();
    await page.selectOption('select[aria-label="Theme"]', "light");
    const light = await bg();
    for (let i = 0; i < 3; i++)
      assert.notEqual(light[i], dark[i], `${i}: ${dark[i]} → ${light[i]}`);
    assert.equal(light[0], "rgb(240, 236, 229)");
    // Remembered on this machine (A10).
    await page.reload();
    await page.waitForSelector(".activity");
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "light");
  } finally {
    await close(s, page);
  }
});
