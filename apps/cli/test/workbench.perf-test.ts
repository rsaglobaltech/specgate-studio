/**
 * The workbench's budgets in a real browser (REQ-035, REQ-036, ADR-0002): run
 * apart from the other tests, one file at a time, so the budget measures the
 * studio and not the machine's other work.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { PERF, browser, close, open, studio } from "./support.js";

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
