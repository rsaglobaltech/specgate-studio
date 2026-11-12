/**
 * draft-workbench-v2 in a real browser: the bottom panel always there
 * (REQ-184), no folder open (REQ-185), the whole project under its root
 * (REQ-186) with an icon for each kind (REQ-187), editor splits and groups
 * (REQ-188, REQ-189, REQ-192), the panel's position and the side bars
 * (REQ-190), and the layout kept per project (REQ-191). The host is fed by
 * fakes; the desktop scenarios run the same bundle.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { close, open, type Page } from "./support.js";
import { sprich } from "./sprich.js";

const texts = (page: Page, sel: string) =>
  page.$$eval(sel, (els) => els.map((e) => (e as HTMLElement).innerText.trim()));

// ── REQ-184 ─────────────────────────────────────────────────────────────

test('REQ-184 SCN-548: Questions in Spanish — the bottom panel with its five tabs, the shell and the folder, and "+"', async () => {
  const s = await sprich();
  const page = await open(s, { lang: "es" });
  try {
    await page.click('.sga[data-view="questions"]');
    await page.waitForSelector(".panel .ptab");
    assert.equal(await page.$(".tabs"), null, "no file, no tab strip");
    assert.deepEqual(await texts(page, ".panel .ptab"), [
      "TERMINAL",
      "GATE",
      "PROBLEMAS",
      "SALIDA DEL AGENTE",
      "TRAZABILIDAD",
    ]);
    await page.waitForFunction(() =>
      document.querySelector('[data-testid="panel-shell"]')?.textContent?.includes(" · "),
    );
    const shell = (await page.textContent('[data-testid="panel-shell"]'))!;
    assert.match(shell, /^\S+ · .*sprich$/, shell);
    assert.equal(await page.textContent('[data-testid="panel-new"]'), "+");
    assert.equal(
      await page.getAttribute('[data-testid="panel-new"]', "aria-label"),
      "Nueva terminal",
    );
  } finally {
    await close(s, page);
  }
});

test('REQ-184 SCN-549: "+" opens a new terminal in the project\'s folder, its prompt ready', async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    const before = await page.$$eval('.term-tab[data-terminal^="t"]', (els) => els.length);
    await page.click('[data-testid="panel-new"]');
    await page.waitForFunction(
      (n) => document.querySelectorAll('.term-tab[data-terminal^="t"]').length === n + 1,
      before,
    );
    assert.equal(await page.getAttribute('.ptab[aria-selected="true"]', "data-tab"), "terminal");
    const id = (await page.getAttribute('.term-tab[aria-selected="true"]', "data-terminal"))!;
    assert.match(id, /^t/);
  } finally {
    await close(s, page);
  }
});
