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
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { NodeFolders } from "@specgate-studio/adapter-node";
import { serve } from "../src/index.js";
import { MOD, browser, close, open, type Page } from "./support.js";
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
  ".git/HEAD": "ref: refs/heads/main\n",
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
    // .git hidden, as VS Code's files.exclude does by default (A11).
    assert.ok(!top.some(([q]) => q === ".git"), ".git hidden");
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

// ── REQ-185 ─────────────────────────────────────────────────────────────

/**
 * The studio started with no folder: the Developer's folders a temporary
 * home with `mvp/sprich-platform/sprich`; Open Folder and Clone open sprich's
 * own host, fed by fakes; `gh` and `git` recorded, not run.
 */
async function noFolder(opts: { gh?: boolean } = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "studio-home-"));
  fs.mkdirSync(path.join(home, "mvp", "sprich-platform", "sprich"), { recursive: true });
  const runs: Array<{ program: string; args: string[]; cwd: string }> = [];
  const opened: string[] = [];
  const project = await sprich();
  const host = await serve({
    projectDir: home,
    noFolder: true,
    port: 0,
    folders: {
      folders: new NodeFolders(home),
      programs: {
        run: async (program, args, cwd, out) => {
          runs.push({ program, args: [...args], cwd });
          if (program === "gh" && args[0] === "auth") return opts.gh ? 0 : 1;
          out("Cloning into 'sprich'...\n");
          fs.mkdirSync(args.at(-1)!, { recursive: true });
          return 0;
        },
      },
      open: async (dir) => (opened.push(dir), { url: project.url }),
    },
  });
  const page = await browser.newPage({ locale: "en-US" });
  await page.goto(host.url.replace(/^ws/, "http"));
  await page.waitForSelector("body[data-ready] .activity .sga");
  return {
    home,
    runs,
    opened,
    page,
    project,
    close: async () => {
      await page.close();
      await host.close();
      await project.host.close();
      fs.rmSync(home, { recursive: true, force: true });
    },
  };
}

test('REQ-185 SCN-550: the studio with no folder — "No folder opened", Open Folder and Clone Repository, each with its "?"', async () => {
  const s = await noFolder();
  try {
    await s.page.click('.sga[data-view="explorer"]');
    const side = s.page.locator('.side [data-testid="no-folder"]');
    await side.waitFor();
    assert.equal(
      (await s.page.locator(".side .shead").first().innerText()).split("\n")[0],
      "NO FOLDER OPENED",
    );
    const text = await side.innerText();
    assert.match(text, /You have not yet opened a folder\./);
    assert.match(text, /clones? a repository into a folder you choose and opens it/i);
    assert.equal(await side.locator('[data-act="folder-open"]').innerText(), "Open Folder");
    assert.equal(await side.locator('[data-act="folder-clone"]').innerText(), "Clone Repository");
    assert.equal(await side.locator(".hq").count(), 2, "a ? for each");
    await side.locator('[data-act="folder-clone"] + .hq').click();
    const help = s.page.locator('[role="dialog"] [data-action="folder-clone"]');
    await help.waitFor();
    assert.match(await help.innerText(), /gh repo clone/);
  } finally {
    await s.close();
  }
});

test("REQ-185 SCN-551: Open Folder, ~/mvp/sprich-platform/sprich chosen — sprich's Explorer with its root and its Home", async () => {
  const s = await noFolder();
  try {
    await s.page.click('.sga[data-view="explorer"]');
    await s.page.click('.side [data-act="folder-open"]');
    const chooser = s.page.locator('[role="dialog"][data-testid="folder-chooser"]');
    await chooser.waitFor();
    assert.equal(await chooser.locator('[data-testid="chooser-path"]').innerText(), s.home);
    for (const name of ["mvp", "sprich-platform", "sprich"])
      await chooser.locator(`[data-folder="${name}"]`).click();
    await chooser.locator('[data-testid="chooser-ok"]').click();
    await s.page.waitForURL(s.project.url);
    await s.page.waitForSelector("body[data-ready] .activity .sga");
    assert.deepEqual(s.opened, [path.join(s.home, "mvp", "sprich-platform", "sprich")]);
    await s.page.click('.sga[data-view="explorer"]');
    await s.page.waitForSelector('[data-testid="tree-root"]');
    assert.equal(await s.page.innerText('[data-testid="tree-root"]'), "SPRICH");
  } finally {
    await s.close();
  }
});

test("REQ-185 SCN-572: Clone Repository with the GitHub CLI signed in — gh repo clone into ~/mvp/sprich, shown in the terminal, then sprich opened", async () => {
  const s = await noFolder({ gh: true });
  try {
    await s.page.click('.sga[data-view="explorer"]');
    await s.page.click('.side [data-act="folder-clone"]');
    const dialog = s.page.locator('[role="dialog"][data-testid="clone-dialog"]');
    await dialog.waitFor();
    await dialog.locator('[data-testid="clone-repo"]').fill("rsaglobaltech/sprich");
    await dialog.locator('[data-folder="mvp"]').click();
    await dialog.locator('[data-testid="clone-ok"]').click();
    await s.page.waitForURL(s.project.url);
    const dest = path.join(s.home, "mvp", "sprich");
    assert.deepEqual(
      s.runs.map((r) => [r.program, ...r.args]),
      [
        ["gh", "auth", "status"],
        ["gh", "repo", "clone", "rsaglobaltech/sprich", dest],
      ],
    );
    assert.equal(s.runs[1]!.cwd, path.join(s.home, "mvp"));
    assert.deepEqual(s.opened, [dest]);
  } finally {
    await s.close();
  }
});

test("REQ-185: Clone without the GitHub CLI — git clone, echoed in the studio's terminal before the folder opens", async () => {
  const s = await noFolder({ gh: false });
  try {
    // The page stays: the echo is read before sprich opens.
    await s.page.evaluate(() => {
      (window as any).__studio.stayOnOpen = true;
    });
    await s.page.click('.sga[data-view="explorer"]');
    await s.page.click('.side [data-act="folder-clone"]');
    const dialog = s.page.locator('[role="dialog"][data-testid="clone-dialog"]');
    await dialog.locator('[data-testid="clone-repo"]').fill("rsaglobaltech/sprich");
    await dialog.locator('[data-testid="clone-ok"]').click();
    const dest = path.join(s.home, "sprich");
    await s.page.waitForFunction(() => (window as any).__studio.opening);
    assert.deepEqual(s.runs.at(-1)!.args, [
      "clone",
      "https://github.com/rsaglobaltech/sprich.git",
      dest,
    ]);
    const text = await s.page.evaluate(() => {
      const b = (window as any).__studio.terms.get("specgate").buffer.active;
      const out: string[] = [];
      for (let i = 0; i < b.length; i++) out.push(b.getLine(i).translateToString(true));
      return out.join("\n");
    });
    assert.match(text, /git clone https:\/\/github\.com\/rsaglobaltech\/sprich\.git/);
    assert.match(text, /Cloning into 'sprich'/);
  } finally {
    await s.close();
  }
});

// ── REQ-188 · REQ-189 · REQ-192 ─────────────────────────────────────────

const SPEC = "docs/specs/changes/draft-pedidos/specs/pedidos/spec.md";
const FEATURE = "features/pedidos/REQ-031.feature";
const EDITOR_DISK = {
  [SPEC]:
    "# Delta — pedidos\n\n### Requirement: REQ-031 — Cancel an order\n\nThe system SHALL let a customer cancel.\n",
  [FEATURE]: "Feature: REQ-031\n",
  "spec.md": "# spec\n",
  "docs/brief.md": "# brief\n",
};

/** A file opened with Ctrl/Cmd+P, in the active group. */
async function quickOpen(page: Page, file: string) {
  await page.keyboard.press(`${MOD}+P`);
  await page.keyboard.type(file);
  await page.click(`.palette li >> text="${file}"`);
  await page.waitForSelector(`.egroup[data-active] .tab[aria-selected="true"][title="${file}"]`);
  await page.waitForSelector(".egroup[data-active] .monaco-editor .view-lines");
}

const groups = (page: Page) =>
  page.$$eval(".egroup", (els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return {
        id: e.getAttribute("data-group"),
        active: e.hasAttribute("data-active"),
        tabs: [...e.querySelectorAll(".tab")].map((t) => t.getAttribute("title")),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    }),
  );

test("REQ-188 SCN-560: REQ-031.feature dragged to the right edge — the overlay over the right half, then a new right group", async () => {
  const s = await sprich({ files: EDITOR_DISK });
  const page = await open(s);
  try {
    await quickOpen(page, SPEC);
    await quickOpen(page, FEATURE);
    const body = (await page.$(".egroup .ebody"))!;
    const box = (await body.boundingBox())!;
    await page.hover(`.egroup .tab[title="${FEATURE}"]`);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2, { steps: 8 });
    const overlay = await page.waitForSelector('.drop-overlay[data-zone="right"]');
    const o = (await overlay.boundingBox())!;
    assert.ok(Math.abs(o.width - box.width / 2) < 3, "over the right half");
    assert.ok(Math.abs(o.x - (box.x + box.width / 2)) < 3);
    await page.mouse.up();
    await page.waitForFunction(() => document.querySelectorAll(".egroup").length === 2);
    const [left, right] = await groups(page);
    assert.deepEqual(left!.tabs, [SPEC]);
    assert.deepEqual(right!.tabs, [FEATURE]);
    assert.ok(right!.x > left!.x);
    assert.equal(await page.$$eval(".egroup .tabs[role=tablist]", (e) => e.length), 2);
  } finally {
    await close(s, page);
  }
});

test("REQ-188 SCN-561: Ctrl+\\, then Ctrl+K and Down — three groups: left, right, and one under the right, each with spec.md", async () => {
  const s = await sprich({ files: EDITOR_DISK });
  const page = await open(s);
  try {
    await quickOpen(page, "spec.md");
    await page.keyboard.press(`${MOD}+Backslash`);
    await page.waitForFunction(() => document.querySelectorAll(".egroup").length === 2);
    await page.keyboard.press(`${MOD}+K`);
    await page.keyboard.press("ArrowDown");
    await page.waitForFunction(() => document.querySelectorAll(".egroup").length === 3);
    const [a, b, c] = await groups(page);
    for (const g of [a, b, c]) assert.deepEqual(g!.tabs, ["spec.md"]);
    assert.ok(b!.x > a!.x && Math.abs(c!.x - b!.x) <= 1, "the second right, the third under it");
    assert.ok(c!.y > b!.y && Math.abs(a!.h - (b!.h + c!.h)) < 8);
    assert.ok(c!.active);
  } finally {
    await close(s, page);
  }
});

test('REQ-188 SCN-562: "Split Up" in the tab\'s menu, then "Split Editor Left" in the palette', async () => {
  const s = await sprich({ files: EDITOR_DISK });
  const page = await open(s);
  try {
    await quickOpen(page, "docs/brief.md");
    await page.click('.egroup .tab[title="docs/brief.md"]', { button: "right" });
    await page.click('.ctx [data-act="split-up"]');
    await page.waitForFunction(() => document.querySelectorAll(".egroup").length === 2);
    const [top, first] = await groups(page);
    assert.ok(top!.y < first!.y && top!.active, "a group above the first, active");
    await page.keyboard.press(`${MOD}+Shift+P`);
    await page.keyboard.type("Split Editor Left");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelectorAll(".egroup").length === 3);
    const all = await groups(page);
    const active = all.find((g) => g.active)!;
    const beside = all.find((g) => g.id === top!.id)!;
    assert.ok(
      active.x < beside.x && Math.abs(active.y - beside.y) <= 1,
      "left of the one that was active",
    );
    for (const g of all) assert.deepEqual(g.tabs, ["docs/brief.md"]);
  } finally {
    await close(s, page);
  }
});

test("REQ-189 SCN-563: REQ-031's spec in two groups — typed in the left, the same text in the right, both unsaved, one save writes once", async () => {
  const s = await sprich({ files: EDITOR_DISK });
  const page = await open(s);
  try {
    await quickOpen(page, SPEC);
    await page.keyboard.press(`${MOD}+Backslash`);
    await page.waitForFunction(
      () => document.querySelectorAll(".egroup .monaco-editor").length === 2,
    );
    await page.click(".egroup >> nth=0 >> .monaco-editor .view-line >> nth=0");
    await page.keyboard.press(`${MOD}+End`);
    await page.keyboard.type("Hola");
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".egroup")].every((g) => g.textContent?.includes("Hola")),
    );
    assert.equal(await page.$$eval(".egroup .tab .dirty", (e) => e.length), 2);
    await page.keyboard.press(`${MOD}+S`);
    await page.waitForFunction(() => document.querySelectorAll(".egroup .tab .dirty").length === 0);
    assert.deepEqual(
      s.writes.filter((w) => w === SPEC),
      [SPEC],
    );
    assert.match(s.disk[SPEC]!, /Hola/);
  } finally {
    await close(s, page);
  }
});

test("REQ-189 SCN-564: the right group's only tab closed — one group fills the editor area", async () => {
  const s = await sprich({ files: EDITOR_DISK });
  const page = await open(s);
  try {
    await quickOpen(page, SPEC);
    await quickOpen(page, FEATURE);
    await page.click(`.egroup .tab[title="${FEATURE}"]`, { button: "right" });
    await page.click('.ctx [data-act="split-right"]');
    await page.waitForFunction(() => document.querySelectorAll(".egroup").length === 2);
    // The left group keeps both; the right one holds only the feature.
    await page.click(`.egroup >> nth=0 >> .tab[title="${FEATURE}"] >> .x`);
    const area = (await page.$(".egrid"))!;
    const width = (await area.boundingBox())!.width;
    await page.click(`.egroup >> nth=1 >> .tab[title="${FEATURE}"] >> .x`);
    await page.waitForFunction(() => document.querySelectorAll(".egroup").length === 1);
    const [only] = await groups(page);
    assert.ok(Math.abs(only!.w - width) < 2, "fills the editor area");
    assert.deepEqual(only!.tabs, [SPEC]);
  } finally {
    await close(s, page);
  }
});

const splitter = ".egrid .splitter";

test("REQ-189 SCN-565: the left group 70 % wide; Ctrl/Cmd+2 makes the right active; a double-click on the splitter evens them", async () => {
  const s = await sprich({ files: EDITOR_DISK });
  const page = await open(s);
  try {
    await quickOpen(page, "spec.md");
    await page.keyboard.press(`${MOD}+Backslash`);
    await page.waitForFunction(() => document.querySelectorAll(".egroup").length === 2);
    const area = (await (await page.$(".egrid"))!.boundingBox())!;
    const bar = (await (await page.$(splitter))!.boundingBox())!;
    await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2);
    await page.mouse.down();
    await page.mouse.move(area.x + area.width * 0.7, bar.y + bar.height / 2, { steps: 6 });
    await page.mouse.up();
    const seventy = Number(await page.getAttribute(splitter, "aria-valuenow"));
    assert.ok(Math.abs(seventy - 70) <= 1, String(seventy));
    await page.keyboard.press(`${MOD}+1`);
    await page.keyboard.press(`${MOD}+2`);
    const [, right] = await groups(page);
    assert.ok(right!.active, "the right group active");
    await page.dblclick(splitter);
    const [l, r] = await groups(page);
    assert.ok(Math.abs(l!.w - r!.w) <= 2, `${l!.w} and ${r!.w}`);
    assert.equal(await page.getAttribute(splitter, "aria-valuenow"), "50");
  } finally {
    await close(s, page);
  }
});

test("REQ-192 SCN-570: the Reviewer tabs to the splitter and presses Right three times — the left group three steps wider, a separator with its value", async () => {
  const s = await sprich({ files: EDITOR_DISK });
  const page = await open(s);
  try {
    await quickOpen(page, "spec.md");
    await page.keyboard.press(`${MOD}+Backslash`);
    await page.waitForFunction(() => document.querySelectorAll(".egroup").length === 2);
    assert.equal(await page.getAttribute(splitter, "role"), "separator");
    assert.equal(await page.getAttribute(splitter, "aria-orientation"), "vertical");
    assert.equal(await page.getAttribute(splitter, "tabindex"), "0");
    assert.equal(await page.getAttribute(splitter, "aria-valuemin"), "0");
    assert.equal(await page.getAttribute(splitter, "aria-valuemax"), "100");
    const [before] = await groups(page);
    await page.focus(splitter);
    for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
    // Drawn once the three steps are in: a render may come after the last key.
    await page
      .waitForFunction(
        (w) =>
          Math.abs(document.querySelector(".egroup")!.getBoundingClientRect().width - w - 30) <= 2,
        before!.w,
        { timeout: 3000 },
      )
      .catch(() => undefined);
    const [after] = await groups(page);
    assert.ok(Math.abs(after!.w - before!.w - 30) <= 2, `${before!.w} → ${after!.w}`);
    const now = Number(await page.getAttribute(splitter, "aria-valuenow"));
    assert.ok(now > 50, String(now));
    assert.equal(await page.$eval(".egroup .tabs", (e) => e.getAttribute("role")), "tablist");
    assert.equal(await page.$eval(".egroup", (e) => e.getAttribute("role")), "group");
  } finally {
    await close(s, page);
  }
});

test('REQ-192 SCN-571: in Spanish, the "?" beside "Dividir el editor a la derecha" — under [ POR DEBAJO ], a new group on the right, no file written, no command', async () => {
  const s = await sprich({ files: EDITOR_DISK });
  const page = await open(s, { lang: "es" });
  try {
    await quickOpen(page, "spec.md");
    await page.click('.egroup .tab[title="spec.md"]', { button: "right" });
    assert.equal(
      await page.innerText('.ctx [data-act="split-right"]'),
      "Dividir el editor a la derecha",
    );
    await page.click('.ctx [data-act="split-right"] + .hq');
    const help = page.locator('[role="dialog"]');
    await help.locator('[data-action="editor-split"]').waitFor();
    const text = await help.innerText();
    assert.match(text, /\[ POR DEBAJO \]/);
    assert.match(text, /grupo de editores nuevo a la derecha/);
    assert.match(text, /No escribe ningún archivo y no ejecuta ningún comando/);
    assert.equal(s.runs.length, 0, "nothing ran");
  } finally {
    await close(s, page);
  }
});

// ── REQ-190 ─────────────────────────────────────────────────────────────

const box = async (page: Page, sel: string) => {
  const b = await (await page.$(sel))?.boundingBox();
  return b ?? null;
};

test('REQ-190 SCN-566: "Panel Position: Right", then maximized over the editor area, then restored with the same button', async () => {
  const s = await sprich({ files: EDITOR_DISK });
  const page = await open(s);
  try {
    await quickOpen(page, "spec.md");
    await page.keyboard.press(`${MOD}+Shift+P`);
    await page.keyboard.type("Panel Position: Right");
    await page.keyboard.press("Enter");
    await page.waitForSelector('.panel[data-position="right"]');
    const main = (await box(page, ".ecol > .main"))!;
    let panel = (await box(page, ".panel"))!;
    assert.ok(panel.x >= main.x + main.width - 1, "right of the editor groups");
    assert.ok(Math.abs(panel.y - main.y) < 2);
    await page.click('[data-testid="panel-maximize"]');
    await page.waitForSelector(".panel[data-maximized]");
    panel = (await box(page, ".panel"))!;
    const mainNow = await box(page, ".ecol > .main");
    assert.ok(!mainNow || mainNow.width < 2, "the editor area under the panel");
    assert.ok(panel.width > main.width, "over the editor area");
    await page.click('[data-testid="panel-maximize"]');
    await page.waitForSelector(".panel:not([data-maximized])");
    assert.ok(Math.abs((await box(page, ".ecol > .main"))!.width - main.width) < 2, "restored");
  } finally {
    await close(s, page);
  }
});

test("REQ-190 SCN-567: the agent panel hidden, the side bar dragged to 400 px — the editor takes the agent panel's room", async () => {
  const s = await sprich({ files: EDITOR_DISK });
  const page = await open(s);
  try {
    await page.click('.sga[data-view="explorer"]');
    // Shown by default, as the board draws it (REQ-181); Ctrl/Cmd+Alt+B hides and shows it.
    await page.waitForSelector('[data-testid="agent-panel"]');
    await page.keyboard.press(`${MOD}+Alt+B`);
    await page.waitForSelector('[data-testid="agent-panel"]', { state: "detached" });
    await page.keyboard.press(`${MOD}+Alt+B`);
    await page.waitForSelector('[data-testid="agent-panel"]');
    const main = (await box(page, ".ecol > .main"))!;
    const agent = (await box(page, '[data-testid="agent-panel"]'))!;
    await page.click('[data-testid="agent-hide"]');
    await page.waitForSelector('[data-testid="agent-panel"]', { state: "detached" });
    const wider = (await box(page, ".ecol > .main"))!;
    assert.ok(
      Math.abs(wider.width - (main.width + agent.width)) < 3,
      `the agent panel's room: ${main.width} + ${agent.width} → ${wider.width}`,
    );
    const side = (await box(page, ".side"))!;
    const edge = (await box(page, '[data-testid="side-sash"]'))!;
    await page.mouse.move(edge.x + edge.width / 2, edge.y + 100);
    await page.mouse.down();
    await page.mouse.move(side.x + 400, edge.y + 100, { steps: 6 });
    await page.mouse.up();
    assert.equal(Math.round((await box(page, ".side"))!.width), 400);
  } finally {
    await close(s, page);
  }
});

// ── REQ-191 ─────────────────────────────────────────────────────────────

test("REQ-191 SCN-568: sprich opened again — the same two groups, tabs and sizes, the panel on the right", async () => {
  const s = await sprich({ files: EDITOR_DISK });
  const page = await open(s);
  try {
    await quickOpen(page, SPEC);
    await quickOpen(page, FEATURE);
    await page.click(`.egroup .tab[title="${FEATURE}"]`, { button: "right" });
    await page.click('.ctx [data-act="split-right"]');
    await page.click(`.egroup >> nth=0 >> .tab[title="${FEATURE}"] >> .x`);
    await page.focus(splitter);
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
    await page.keyboard.press(`${MOD}+Shift+P`);
    await page.keyboard.type("Panel Position: Right");
    await page.keyboard.press("Enter");
    await page.waitForSelector('.panel[data-position="right"]');
    const before = await groups(page);
    const value = await page.getAttribute(splitter, "aria-valuenow");
    await page.waitForTimeout(600);
    await page.reload();
    await page.waitForSelector("body[data-ready] .activity .sga");
    await page.waitForFunction(() => document.querySelectorAll(".egroup").length === 2);
    await page.waitForSelector('.panel[data-position="right"]');
    const after = await groups(page);
    assert.deepEqual(
      after.map((g) => g.tabs),
      before.map((g) => g.tabs),
    );
    assert.deepEqual(
      [[SPEC], [FEATURE]],
      after.map((g) => g.tabs),
    );
    assert.equal(await page.getAttribute(splitter, "aria-valuenow"), value);
  } finally {
    await close(s, page);
  }
});

test("REQ-191 SCN-569: narrowed to 800 px — one group with both files, the side bars collapsed; widened to 1440 px — all as it was", async () => {
  const s = await sprich({ files: EDITOR_DISK });
  const page = await open(s);
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.click('.sga[data-view="explorer"]');
    // The agent panel shows by default (REQ-181).
    await page.waitForSelector('[data-testid="agent-panel"]');
    await quickOpen(page, SPEC);
    await quickOpen(page, FEATURE);
    await page.click(`.egroup .tab[title="${FEATURE}"]`, { button: "right" });
    await page.click('.ctx [data-act="split-right"]');
    await page.click(`.egroup >> nth=0 >> .tab[title="${FEATURE}"] >> .x`);
    await page.waitForFunction(() => document.querySelectorAll(".egroup").length === 2);
    await page.setViewportSize({ width: 800, height: 900 });
    await page.waitForFunction(() => document.querySelectorAll(".egroup").length === 1);
    const [one] = await groups(page);
    assert.deepEqual(one!.tabs, [SPEC, FEATURE]);
    assert.equal(await page.$(".side"), null, "the side bar collapsed to its bar");
    assert.equal(await page.$('[data-testid="agent-panel"]'), null);
    assert.ok(await page.$('[data-testid="agent-bar"]'), "the agent panel to its bar");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() => document.querySelectorAll(".egroup").length === 2);
    const [l, r] = await groups(page);
    assert.deepEqual([l!.tabs, r!.tabs], [[SPEC], [FEATURE]]);
    assert.ok(await page.$(".side"));
    assert.ok(await page.$('[data-testid="agent-panel"]'));
  } finally {
    await close(s, page);
  }
});

test("REQ-186: the Explorer's sections stack like VS Code's panes — whole rows, no overlap, long names cut with their tooltip, a sash to resize", async () => {
  const many = Array.from({ length: 9 }, (_, i) => ({
    id: i === 0 ? "kan-13-register-vehicle-entry-with-a-very-long-name" : `draft-mod${i}`,
  }));
  const s = await sprich({ files: SPRICH_DISK, sections: { changes: { changes: many } } });
  const page = await open(s);
  try {
    await explorer(page);
    const panes = () =>
      page.$$eval(".explorer .ssec", (els) =>
        els.map((e) => {
          const r = e.getBoundingClientRect();
          let next = e.nextElementSibling;
          while (next && !next.classList.contains("shead")) next = next.nextElementSibling;
          return {
            h: e.clientHeight,
            bottom: Math.round(r.bottom),
            nextTop: Math.round(next!.getBoundingClientRect().top),
          };
        }),
      );
    for (const pane of await panes()) {
      assert.equal(pane.h % 26, 0, `whole rows: ${pane.h}`);
      assert.ok(pane.bottom <= pane.nextTop, "no overlap with the next header");
    }
    const long = page.locator(
      '.explorer [data-key="change:kan-13-register-vehicle-entry-with-a-very-long-name"]',
    );
    assert.equal(
      await long.getAttribute("title"),
      "kan-13-register-vehicle-entry-with-a-very-long-name",
    );
    assert.equal(
      await long.locator(".name").evaluate((e) => getComputedStyle(e).textOverflow),
      "ellipsis",
    );
    const before = (await panes())[0]!.h;
    const sash = (await (await page.$('[data-testid="sash-spec"]'))!.boundingBox())!;
    await page.mouse.move(sash.x + 40, sash.y + sash.height / 2);
    await page.mouse.down();
    await page.mouse.move(sash.x + 40, sash.y + sash.height / 2 + 52, { steps: 5 });
    await page.mouse.up();
    assert.equal((await panes())[0]!.h, before + 52, "two rows taller");
    assert.equal(await page.getAttribute('[data-testid="sash-spec"]', "role"), "separator");
  } finally {
    await close(s, page);
  }
});
