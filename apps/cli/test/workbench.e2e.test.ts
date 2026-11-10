/**
 * draft-workbench in a real browser: `specgate-studio serve` with the UI
 * bundle, the host fed by fakes so the test reads no real project (REQ-031 …
 * REQ-036). The desktop scenarios run the same bundle; the Tauri window comes
 * with phase 3.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { MOD, PERF, browser, close, open, studio, type Page } from "./support.js";

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
    await page.click('.sga[data-view="explorer"]');
    await page.click('.row[title="docs/brief.md"]');
    await page.click('.sga[data-view="explorer"]');
    await page.click('.row[title="docs/specs/changes/draft-workbench/proposal.md"]');
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
    await page.keyboard.press(`${MOD}+J`);
    assert.equal(
      await page.$eval(".panel", (e) => (e as HTMLElement).hidden),
      true,
      "hidden first",
    );
    await page.click('.sga[data-view="explorer"]');
    await page.click('.row[title="docs/brief.md"]');
    await page.click('.sga[data-view="explorer"]');
    await page.click('.row[title="docs/specs/changes/draft-workbench/proposal.md"]');
    await page.keyboard.press(`${MOD}+J`);
    await page.keyboard.press("Control+Shift+Tab");
    assert.equal(await page.$eval(".panel", (e) => (e as HTMLElement).hidden), false);
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

// ── REQ-035, REQ-036: the budgets of ADR-0002 ──────────────────────────

test(
  "REQ-035 SCN-100: first load, empty cache — the activity bar in under 300 ms, Changes from it in under 1 s",
  { skip: !PERF && "measured on the Linux runner (A12); STUDIO_PERF=1 to run here" },
  async () => {
    const s = await studio();
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto(s.url);
      await page.waitForSelector(".activity .sga");
      const visible = await page.evaluate(() => {
        const m = performance.getEntriesByName("workbench:visible")[0];
        return m ? m.startTime : Infinity;
      });
      assert.ok(visible < 300, `the workbench was visible at ${visible.toFixed(0)} ms`);
      await page.click('.sga[data-view="changes"]');
      await page.waitForFunction(
        () => document.querySelector(".content h1")?.textContent === "Changes",
      );
      const interactive = await page.evaluate(() => performance.now());
      assert.ok(interactive < 1000, `Changes opened at ${interactive.toFixed(0)} ms`);
    } finally {
      await context.close();
      await s.host.close();
    }
  },
);

test(
  "REQ-036 SCN-101: from Home to Changes, the project read — Changes shows in under 50 ms",
  { skip: !PERF && "measured on the Linux runner (A12); STUDIO_PERF=1 to run here" },
  async () => {
    const s = await studio();
    const page = await open(s);
    try {
      await page.waitForFunction(
        () => document.querySelector('[data-testid="status-progress"]')?.textContent === "13 of 14",
      );
      const times: number[] = [];
      for (const v of ["changes", "home", "changes", "questions", "report", "changes"]) {
        times.push(
          await page.evaluate(
            (view) =>
              new Promise<number>((done) => {
                const t0 = performance.now();
                (document.querySelector(`.sga[data-view="${view}"]`) as HTMLButtonElement).click();
                requestAnimationFrame(() => setTimeout(() => done(performance.now() - t0), 0));
              }),
            v,
          ),
        );
      }
      const worst = Math.max(...times);
      assert.ok(worst < 50, `view switches took ${times.map((t) => t.toFixed(1)).join(", ")} ms`);
    } finally {
      await close(s, page);
    }
  },
);

test(
  "REQ-036 SCN-102: Traceability with 5,000 rows — scrolled first to last at 60 fps, about forty rows in the page",
  { skip: !PERF && "measured on the Linux runner (A12); STUDIO_PERF=1 to run here" },
  async () => {
    const s = await studio({ rows: 5000 });
    const page = await open(s);
    try {
      await page.click('.sga[data-view="traceability"]');
      await page.waitForSelector('[data-testid="traceability-list"] .list[data-count="5000"]');
      const result = await page.evaluate(
        () =>
          new Promise<{ frames: number[]; rendered: number; reachedEnd: boolean }>((done) => {
            const list = document.querySelector(
              '[data-testid="traceability-list"] .list',
            ) as HTMLDivElement;
            const end = list.scrollHeight - list.clientHeight;
            const frames: number[] = [];
            let last = performance.now();
            let rendered = 0;
            const stepPx = end / 120; // two seconds at 60 fps
            const tick = () => {
              const now = performance.now();
              frames.push(now - last);
              last = now;
              rendered = Math.max(rendered, list.querySelectorAll("[data-row]").length);
              if (list.scrollTop >= end - 1) {
                done({
                  frames: frames.slice(1),
                  rendered,
                  reachedEnd: !!list.querySelector('[data-row="4999"]'),
                });
                return;
              }
              list.scrollTop = Math.min(end, list.scrollTop + stepPx);
              requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }),
      );
      assert.ok(result.reachedEnd, "the last row was reached");
      assert.ok(result.rendered < 100, `${result.rendered} rows in the page`);
      const sorted = [...result.frames].sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95)]!;
      const fps = 1000 / (result.frames.reduce((a, b) => a + b, 0) / result.frames.length);
      assert.ok(
        fps >= 55 && p95 < 25,
        `${fps.toFixed(1)} fps on average, p95 frame ${p95.toFixed(1)} ms`,
      );
    } finally {
      await close(s, page);
    }
  },
);
