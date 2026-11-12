/**
 * The Explorer's budget in a real browser (draft-explorer-tree REQ-161, A2):
 * in a project of 50,000 files a folder's children show in under 50 ms, and
 * only the opened folder is read. Measured on the Linux runner, as ADR-0002's
 * budgets are.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { PERF, close, open, studio } from "./support.js";

test(
  "REQ-161 SCN-481: 50,000 files — packages/core's children in under 50 ms, nothing else read",
  { skip: !PERF && "measured on the Linux runner (A12); STUDIO_PERF=1 to run here" },
  async () => {
    const files: Record<string, string> = { "spec.md": "" };
    for (let m = 0; m < 50; m++)
      for (let f = 0; f < 1000; f++) files[`packages/mod${m}/src/f${f}.ts`] = "";
    for (let f = 0; f < 40; f++) files[`packages/core/src/c${f}.ts`] = "";
    files["packages/core/package.json"] = "{}";
    const s = await studio({ files });
    const page = await open(s);
    try {
      await page.click('.sga[data-view="explorer"]');
      await page.click('.explorer .row[data-path="packages"]');
      await page.waitForSelector('.explorer .row[data-path="packages/core"]');
      s.childrenReads.length = 0;
      const ms = await page.evaluate(
        () =>
          new Promise<number>((done) => {
            const t0 = performance.now();
            const seen = () =>
              document.querySelector('.explorer .row[data-path="packages/core/src"]');
            const obs = new MutationObserver(() => {
              if (seen()) {
                obs.disconnect();
                done(performance.now() - t0);
              }
            });
            obs.observe(document.body, { childList: true, subtree: true });
            (
              document.querySelector('.explorer .row[data-path="packages/core"]') as HTMLElement
            ).click();
          }),
      );
      assert.ok(ms < 50, `packages/core's children showed in ${ms.toFixed(1)} ms`);
      assert.deepEqual(s.childrenReads, ["packages/core"]);
    } finally {
      await close(s, page);
    }
  },
);
