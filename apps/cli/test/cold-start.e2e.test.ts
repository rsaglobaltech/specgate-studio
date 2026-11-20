/**
 * draft-workbench REQ-035 SCN-099: the desktop app's cold start is measured
 * by the page itself. In measure mode — the host started with STUDIO_MEASURE,
 * as `apps/desktop/scripts/measure.mjs --cold-start` starts the release build —
 * the page presses the palette's shortcut once the activity bar shows and
 * reports both moments. The budgets themselves are measured on the release
 * build (apps/desktop/test/budgets.perf-test.ts); this proves the measurement.
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { close, open, studio } from "./support.js";

test("REQ-035 SCN-099: in measure mode the page opens the palette from its shortcut and reports when the bar showed and the palette opened", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "studio-measure-"));
  const out = path.join(dir, "cold-start.json");
  const s = await studio({ measure: out });
  const page = await open(s);
  try {
    await page.waitForSelector(".palette");
    for (let i = 0; i < 100 && !fs.existsSync(out); i++)
      await new Promise((r) => setTimeout(r, 50));
    const m = JSON.parse(fs.readFileSync(out, "utf8")) as {
      origin: number;
      visible: number;
      palette: number;
    };
    assert.ok(m.origin > 0 && m.origin <= m.visible, "the bar showed after the page started");
    assert.ok(m.visible <= m.palette, "the palette opened after the bar showed");
    assert.ok(m.palette <= Date.now(), "moments on the wall clock, comparable with the launch");
  } finally {
    await close(s, page);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("REQ-035 SCN-099: without measure mode the page neither presses the shortcut nor reports", async () => {
  const s = await studio();
  const page = await open(s);
  try {
    await page.waitForSelector(".activity .sga");
    await page.waitForFunction(() => document.body.dataset.ready === "1");
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(await page.locator(".palette").count(), 0);
    assert.equal(await page.locator('meta[name="studio-measure"]').count(), 0);
  } finally {
    await close(s, page);
  }
});
