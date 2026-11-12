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

// ── REQ-186 ─────────────────────────────────────────────────────────────

const SPRICH_DISK = {
  ".gitignore": ".idea/\n",
  ".claude/settings.json": "{}",
  ".github/workflows/ci.yml": "",
  ".idea/workspace.xml": "",
  "node_modules/preact/package.json": "{}",
  "node_modules/typescript/package.json": "{}",
  "docs/brief.md": "# brief\n",
  "src/cart.ts": "",
  "test/cart.test.ts": "",
  "features/pedidos/REQ-031.feature": "Feature: x\n",
  "package.json": "{}",
  LICENSE: "MIT\n",
  "AGENTS.md": "# AGENTS\n",
  "spec.md": "# spec\n",
  "docs/notes.xyz": "",
};
const row = (p: string) => `.explorer .tree .row[data-path="${p}"]`;

async function explorer(page: Page) {
  await page.click('.sga[data-view="explorer"]');
  await page.waitForSelector('.explorer .tree[data-loaded="1"] .row');
}

test("REQ-186 SCN-552: sprich's root under the spec explorer and the modules — dot folders shown, .idea and node_modules dimmed", async () => {
  const s = await sprich({ files: SPRICH_DISK });
  const page = await open(s);
  try {
    await explorer(page);
    const heads = await texts(page, ".explorer .shead");
    assert.equal(heads.at(-1), "SPRICH", "the root named after the project, last");
    assert.ok(heads.indexOf("MODULES · REQUIREMENTS") < heads.indexOf("SPRICH"));
    const top = await page.$$eval(".explorer .tree .row", (els) =>
      els.map((e) => [e.getAttribute("data-path"), e.getAttribute("data-ignored")]),
    );
    for (const p of [".claude", ".github", ".idea", "node_modules", "docs", "src", ".gitignore"])
      assert.ok(
        top.some(([q]) => q === p),
        p,
      );
    const dim = top.filter(([, i]) => i === "1").map(([q]) => q);
    assert.deepEqual(dim, [".idea", "node_modules"]);
  } finally {
    await close(s, page);
  }
});

test("REQ-186 SCN-553: node_modules opened — its folders dimmed, read only now", async () => {
  const s = await sprich({ files: SPRICH_DISK });
  const page = await open(s);
  try {
    await explorer(page);
    assert.ok(!s.childrenReads.includes("node_modules"), "not read while closed");
    await page.click(row("node_modules"));
    await page.waitForSelector(row("node_modules/preact"));
    assert.ok(s.childrenReads.includes("node_modules"), "read once opened");
    for (const p of ["node_modules/preact", "node_modules/typescript"])
      assert.equal(await page.getAttribute(row(p), "data-ignored"), "1", p);
  } finally {
    await close(s, page);
  }
});

// ── REQ-187 ─────────────────────────────────────────────────────────────

const icon = (page: Page, p: string) =>
  page.$eval(`${row(p)} .ficon`, (e) => [
    e.getAttribute("data-kind"),
    getComputedStyle(e).color,
    e.querySelector("svg")?.getAttribute("stroke-width"),
    e.querySelector("svg")?.getAttribute("stroke-linecap"),
  ]);

test("REQ-187 SCN-554: sprich's root — each folder and file with the icon of its kind, docs and src in their colours, docs open showing its open icon", async () => {
  const s = await sprich({ files: SPRICH_DISK });
  const page = await open(s);
  try {
    await explorer(page);
    // The design tokens, dark (A31): docs blue, src accent-soft, test green, features orange.
    assert.deepEqual(await icon(page, "docs"), [
      "folder-docs",
      "rgb(108, 182, 255)",
      "1.8",
      "round",
    ]);
    assert.deepEqual(await icon(page, "src"), ["folder-src", "rgb(255, 138, 92)", "1.8", "round"]);
    assert.equal((await icon(page, "test"))[0], "folder-test");
    assert.equal((await icon(page, "test"))[1], "rgb(76, 195, 138)");
    assert.equal((await icon(page, "features"))[1], "rgb(255, 91, 31)");
    assert.equal((await icon(page, ".github"))[0], "folder-github");
    assert.equal((await icon(page, "node_modules"))[0], "folder-node_modules");
    assert.equal((await icon(page, "package.json"))[0], "package");
    assert.equal((await icon(page, "LICENSE"))[0], "license");
    assert.equal((await icon(page, ".gitignore"))[0], "gitignore");
    assert.equal((await icon(page, "AGENTS.md"))[0], "agents");
    assert.equal(await page.getAttribute(`${row("docs")} .ficon`, "data-open"), null);
    await page.click(row("docs"));
    await page.waitForSelector(row("docs/brief.md"));
    assert.equal(await page.getAttribute(`${row("docs")} .ficon`, "data-open"), "1");
    // Inline, never from the network (REQ-171).
    assert.equal(
      await page.$eval(`${row("docs")} .ficon svg`, (e) => e.querySelector("image, use")),
      null,
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-187 SCN-555: notes.xyz, a kind it does not know — the generic file icon", async () => {
  const s = await sprich({ files: SPRICH_DISK });
  const page = await open(s);
  try {
    await explorer(page);
    await page.click(row("docs"));
    await page.waitForSelector(row("docs/notes.xyz"));
    assert.equal((await icon(page, "docs/notes.xyz"))[0], "file");
  } finally {
    await close(s, page);
  }
});
