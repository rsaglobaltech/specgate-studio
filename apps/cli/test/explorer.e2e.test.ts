/**
 * draft-explorer-tree in a real browser: the tree in the side panel, one
 * folder read when opened and the open ones kept (REQ-161), in the boards'
 * look with types and the specification marked (REQ-162), git's letters
 * (REQ-163), the active file revealed (REQ-164), keys (REQ-165), a menu whose
 * writes stay inside the project (REQ-166), the filter inside the tree
 * (REQ-167), its "?" and notices in both languages (REQ-168), and the spec's
 * sections above (REQ-169). The host is fed by fakes; the desktop scenarios
 * run the same bundle.
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import WebSocket from "ws";
import { MOD, close, open, studio, termText, type Page } from "./support.js";

const WIN = process.platform === "win32";

const REQ_031 = [
  "# Delta — pedidos",
  "",
  "## ADDED Requirements",
  "",
  "### Requirement: REQ-031 — Cancel an order",
  "",
  "The system SHALL let a customer cancel an order until it is shipped.",
  "",
].join("\n");

const SPRICH: Record<string, string> = {
  "spec.md": "# spec\n",
  "package.json": "{}\n",
  "tsconfig.json": "{}\n",
  "docs/brief.md": "# brief\n",
  "docs/notes.md": "notes\n",
  "docs/specs/changes/draft-pedidos/specs/pedidos/spec.md": REQ_031,
  "docs/specs/capabilities/auth/spec.md": "# auth\n",
  "features/pedidos/REQ-031.feature": "Feature: x\n",
  "test/pedidos/REQ-031.test.ts": "// REQ-031\n",
  "packages/core/package.json": "{}\n",
  "packages/core/src/index.ts": "export {};\n",
  "packages/web/index.ts": "export {};\n",
  "src/cart.ts": "export {};\n",
};

type Opts = Parameters<typeof studio>[0];
const sprich = (opts: Opts = {}) => studio({ files: { ...SPRICH }, ...opts });

const row = (p: string) => `.explorer .row[data-path="${p}"]`;
const rows = (page: Page) =>
  page.$$eval(".explorer .tree .row", (els) => els.map((e) => e.getAttribute("data-path")));

async function explorer(page: Page) {
  await page.click('.sga[data-view="explorer"]');
  await page.waitForSelector('.explorer .tree[data-loaded="1"] .row');
}
async function openFolder(page: Page, p: string) {
  if ((await page.getAttribute(row(p), "aria-expanded")) !== "true") await page.click(row(p));
  await page.waitForFunction((sel) => {
    const r = document.querySelector(sel);
    return r?.getAttribute("aria-expanded") === "true";
  }, row(p));
  // Its children read and shown: the folder is read when it opens (REQ-161).
  await page.waitForSelector(`.explorer .row[data-path^="${p}/"]`);
}
const noticeText = (page: Page) => page.textContent(".notice [data-part='ran']");

// ── REQ-161 ─────────────────────────────────────────────────────────────

test("REQ-161 SCN-481: packages/core opened — its children under it, folders first; no other folder read", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await explorer(page);
    assert.deepEqual(await rows(page), [
      "docs",
      "features",
      "packages",
      "src",
      "test",
      "package.json",
      "spec.md",
      "tsconfig.json",
    ]);
    await openFolder(page, "packages");
    await openFolder(page, "packages/core");
    await page.waitForSelector(row("packages/core/src"));
    const all = await rows(page);
    const at = all.indexOf("packages/core");
    assert.deepEqual(all.slice(at + 1, at + 3), [
      "packages/core/src",
      "packages/core/package.json",
    ]);
    assert.deepEqual(
      [...new Set(s.childrenReads)].sort(),
      ["", "packages", "packages/core"],
      "only the folders opened were read",
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-161 SCN-482 SCN-483: the folders left open come back; one closed stays closed", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await explorer(page);
    await openFolder(page, "packages");
    await openFolder(page, "packages/core");
    await openFolder(page, "docs");
    await openFolder(page, "docs/specs");
    await page.waitForTimeout(150);
    await page.reload();
    await page.waitForSelector("body[data-ready]");
    await explorer(page);
    await page.waitForSelector(row("packages/core/src"));
    for (const p of ["packages", "packages/core", "docs", "docs/specs"])
      assert.equal(await page.getAttribute(row(p), "aria-expanded"), "true", p);
    for (const p of ["features", "src", "test"])
      assert.equal(await page.getAttribute(row(p), "aria-expanded"), "false", p);
    // Closing packages/core: its children go, and it stays closed next time.
    await page.click(row("packages/core"));
    await page.waitForSelector(row("packages/core/src"), { state: "detached" });
    await page.waitForTimeout(150);
    await page.reload();
    await page.waitForSelector("body[data-ready]");
    await explorer(page);
    await page.waitForSelector(row("packages/core"));
    assert.equal(await page.getAttribute(row("packages/core"), "aria-expanded"), "false");
  } finally {
    await close(s, page);
  }
});

// ── REQ-162 ─────────────────────────────────────────────────────────────

test('REQ-162 SCN-484: the side panel of the boards — EXPLORER and its "?", the spec marked, types, 26 px rows, the orange inset', async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await page.keyboard.press(`${MOD}+P`);
    await page.keyboard.type("spec.md");
    await page.keyboard.press("Enter");
    await explorer(page);
    const head = page.locator(".explorer .shead").first();
    assert.equal((await head.innerText()).split("\n")[0], "EXPLORER");
    assert.equal(await head.locator(".hq").count(), 1);
    await openFolder(page, "docs");
    for (const p of ["spec.md", "docs/specs", "features"])
      assert.equal(await page.locator(`${row(p)} .spec-mark`).count(), 1, p);
    for (const p of ["docs/brief.md", "package.json", "src"])
      assert.equal(await page.locator(`${row(p)} .spec-mark`).count(), 0, p);
    assert.equal(await page.textContent(`${row("package.json")} .ft`), "JSON");
    assert.equal(await page.getAttribute(row("spec.md"), "aria-current"), "true");
    const style = await page.$eval(row("spec.md"), (e) => {
      const c = getComputedStyle(e);
      return { shadow: c.boxShadow, height: e.getBoundingClientRect().height };
    });
    assert.match(style.shadow, /rgb\(255, 91, 31\) 2px 0px 0px 0px inset/);
    assert.equal(style.height, 26);
    const panel = await page.$eval(".explorer", (e) => getComputedStyle(e).backgroundColor);
    assert.equal(panel, "rgb(28, 29, 34)");
    const header = await page.$eval(".explorer .shead", (e) => e.getBoundingClientRect().height);
    assert.equal(header, 36);
  } finally {
    await close(s, page);
  }
});

test("REQ-162 SCN-485: in Spanish — EXPLORADOR; features/pedidos marked, REQ-031.feature a feature", async () => {
  const s = await sprich();
  const page = await open(s, { lang: "es" });
  try {
    await explorer(page);
    assert.equal(
      (await page.locator(".explorer .shead").first().innerText()).split("\n")[0],
      "EXPLORADOR",
    );
    await openFolder(page, "features");
    await openFolder(page, "features/pedidos");
    assert.equal(await page.locator(`${row("features/pedidos")} .spec-mark`).count(), 1);
    assert.equal(await page.textContent(`${row("features/pedidos/REQ-031.feature")} .ft`), "FT");
  } finally {
    await close(s, page);
  }
});

// ── REQ-163 ─────────────────────────────────────────────────────────────

const CHANGED = {
  uncommitted: ["docs/brief.md", "docs/notes.md", "src/cart.ts"],
  status: { "docs/brief.md": " M", "docs/notes.md": "??", "src/cart.ts": "A " },
};

test("REQ-163 SCN-486: M in amber, U in green, a dot on docs and on the closed src", async () => {
  const s = await sprich(CHANGED);
  const page = await open(s);
  try {
    await explorer(page);
    await page.waitForSelector(`${row("docs")} .gd`);
    assert.equal(await page.locator(`${row("src")} .gd`).count(), 1, "a dot on the closed src");
    await openFolder(page, "docs");
    await page.waitForSelector(`${row("docs/brief.md")} .gl`);
    const letter = (p: string) =>
      page.$eval(`${row(p)} .gl`, (e) => [e.textContent, getComputedStyle(e).color]);
    assert.deepEqual(await letter("docs/brief.md"), ["M", "rgb(227, 179, 65)"]);
    assert.deepEqual(await letter("docs/notes.md"), ["U", "rgb(76, 195, 138)"]);
    await openFolder(page, "src");
    await page.waitForSelector(`${row("src/cart.ts")} .gl`);
    assert.equal((await letter("src/cart.ts"))[0], "A");
  } finally {
    await close(s, page);
  }
});

test("REQ-163 SCN-487: committed — the M and the dot on docs go within 500 ms, no reload", async () => {
  const s = await sprich({ uncommitted: ["docs/brief.md"] });
  const page = await open(s);
  try {
    await explorer(page);
    await openFolder(page, "docs");
    await page.waitForSelector(`${row("docs/brief.md")} .gl`);
    await s.git.commit(s.projectDir, ["docs/brief.md"], "brief", () => undefined);
    const t0 = Date.now();
    s.watcher.emitGit(s.projectDir);
    await page.waitForSelector(`${row("docs/brief.md")} .gl`, { state: "detached" });
    await page.waitForSelector(`${row("docs")} .gd`, { state: "detached" });
    assert.ok(Date.now() - t0 < 500, `${Date.now() - t0} ms`);
  } finally {
    await close(s, page);
  }
});

// ── REQ-164 ─────────────────────────────────────────────────────────────

const DELTA = "docs/specs/changes/draft-pedidos/specs/pedidos/spec.md";

test("REQ-164 SCN-488: a spec opened from the palette — its folders opened, it selected and in view, the cursor in the editor", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await explorer(page);
    await page.keyboard.press(`${MOD}+P`);
    await page.keyboard.type("pedidos/spec.md");
    await page.keyboard.press("Enter");
    await page.waitForSelector(`${row(DELTA)}[aria-selected="true"]`);
    for (const d of [
      "docs",
      "docs/specs",
      "docs/specs/changes",
      "docs/specs/changes/draft-pedidos",
      "docs/specs/changes/draft-pedidos/specs",
      "docs/specs/changes/draft-pedidos/specs/pedidos",
    ])
      assert.equal(await page.getAttribute(row(d), "aria-expanded"), "true", d);
    assert.ok(await page.locator(row(DELTA)).isVisible());
    await page.waitForSelector(".monaco-editor");
    await page.waitForFunction(() => !!document.activeElement?.closest(".monaco-editor"));
  } finally {
    await close(s, page);
  }
});

test("REQ-164 SCN-489: choosing the brief's tab moves the selection to it", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await explorer(page);
    await page.click(row("spec.md"));
    await openFolder(page, "docs");
    await page.click(row("docs/brief.md"));
    await page.click('.tab[title="spec.md"]');
    await page.waitForSelector(`${row("spec.md")}[aria-selected="true"]`);
    await page.click('.tab[title="docs/brief.md"]');
    await page.waitForSelector(`${row("docs/brief.md")}[aria-selected="true"]`);
    assert.equal(await page.getAttribute(row("spec.md"), "aria-selected"), "false");
  } finally {
    await close(s, page);
  }
});

// ── REQ-165 ─────────────────────────────────────────────────────────────

test("REQ-165 SCN-490: Right, Right, Enter on docs — docs open, brief.md selected and in the editor", async () => {
  const s = await studio({
    files: { "docs/brief.md": "# brief\n", "docs/notes.md": "n\n", "spec.md": "# spec\n" },
  });
  const page = await open(s);
  try {
    await explorer(page);
    // The tree focused on the closed folder docs.
    await page.click(row("docs"));
    await page.click(row("docs"));
    assert.equal(await page.getAttribute(row("docs"), "aria-expanded"), "false");
    await page.keyboard.press("ArrowRight");
    await page.waitForSelector(row("docs/brief.md"));
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await page.waitForSelector('.tab[aria-selected="true"][title="docs/brief.md"]');
    assert.equal(await page.getAttribute(row("docs"), "aria-expanded"), "true");
    assert.equal(await page.getAttribute(row("docs/brief.md"), "aria-selected"), "true");
  } finally {
    await close(s, page);
  }
});

test("REQ-165 SCN-491: F2, notes-old.md, Enter — renamed on disk and selected", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await explorer(page);
    await openFolder(page, "docs");
    await page.click(row("docs/notes.md"));
    await page.focus(".explorer .tree");
    await page.keyboard.press("F2");
    await page.fill('[data-testid="tree-name"]', "notes-old.md");
    await page.keyboard.press("Enter");
    await page.waitForSelector(`${row("docs/notes-old.md")}[aria-selected="true"]`);
    assert.equal(await page.locator(row("docs/notes.md")).count(), 0);
    assert.equal(s.disk["docs/notes-old.md"], "notes\n");
    assert.equal("docs/notes.md" in s.disk, false);
    assert.equal(await noticeText(page), "Renamed docs/notes.md to docs/notes-old.md");
  } finally {
    await close(s, page);
  }
});

// ── REQ-166 ─────────────────────────────────────────────────────────────

async function menu(page: Page, p: string, action: string) {
  await page.click(row(p), { button: "right" });
  await page.click(`.ctx [data-act="${action}"]`);
}

test('REQ-166 SCN-492: New file in docs, adr.md — created empty, open, "Created docs/adr.md"', async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await explorer(page);
    await menu(page, "docs", "file-new");
    await page.keyboard.type("adr.md");
    await page.keyboard.press("Enter");
    await page.waitForSelector('.tab[aria-selected="true"][title="docs/adr.md"]');
    assert.equal(s.disk["docs/adr.md"], "");
    await page.waitForSelector(row("docs/adr.md"));
    assert.equal(await noticeText(page), "Created docs/adr.md");
  } finally {
    await close(s, page);
  }
});

test("REQ-166 SCN-493: Delete asks first, then the note goes to the trash", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await explorer(page);
    await openFolder(page, "docs");
    await page.click(row("docs/notes.md"));
    await page.focus(".explorer .tree");
    await page.keyboard.press("Delete");
    const dialog = page.locator('[role="dialog"]');
    assert.equal(await dialog.getAttribute("aria-label"), "Delete docs/notes.md?");
    assert.ok("docs/notes.md" in s.disk, "nothing deleted before the confirmation");
    await dialog.locator('[data-act="confirm"]').click();
    await page.waitForSelector(row("docs/notes.md"), { state: "detached" });
    assert.deepEqual(s.trash, ["docs/notes.md"]);
    assert.equal(await noticeText(page), "Moved docs/notes.md to the trash");
  } finally {
    await close(s, page);
  }
});

test("REQ-166 SCN-501: Shift+Delete removes for good, after a confirmation that says so", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await explorer(page);
    await openFolder(page, "docs");
    await page.click(row("docs/notes.md"));
    await page.focus(".explorer .tree");
    await page.keyboard.press("Shift+Delete");
    const dialog = page.locator('[role="dialog"]');
    assert.equal(
      await dialog.getAttribute("aria-label"),
      "Delete docs/notes.md for good? It cannot be undone.",
    );
    await dialog.locator('[data-act="confirm"]').click();
    await page.waitForSelector(row("docs/notes.md"), { state: "detached" });
    assert.deepEqual(s.trash, [], "not in the trash");
    assert.equal("docs/notes.md" in s.disk, false);
    assert.equal(await noticeText(page), "Deleted docs/notes.md for good");
  } finally {
    await close(s, page);
  }
});

test("REQ-166 SCN-494: a page of another site cannot rename spec.md — its WebSocket is refused", async () => {
  const s = await sprich();
  try {
    const ws = new WebSocket(s.host.url, { headers: { Origin: "http://evil.example" } });
    const status = await new Promise<number>((ok) => {
      ws.on("unexpected-response", (_req, res) => ok(res.statusCode ?? 0));
      ws.on("open", () => {
        ws.send(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "file.rename",
            params: { from: "spec.md", to: "x.md" },
          }),
        );
        setTimeout(() => ok(200), 300);
      });
      ws.on("error", () => undefined);
    });
    ws.terminate();
    assert.equal(status, 403);
    assert.ok("spec.md" in s.disk);
    assert.equal("x.md" in s.disk, false);
  } finally {
    await close(s);
  }
});

test("REQ-166 SCN-495: New file through vendor-link, a link outside sprich — refused, nothing created", async () => {
  const s = await sprich({ links: ["vendor-link"] });
  const page = await open(s);
  try {
    await explorer(page);
    await menu(page, "vendor-link", "file-new");
    await page.keyboard.type("a.md");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".notice [data-part='ran']");
    assert.equal(
      await noticeText(page),
      "Not inside the project: vendor-link/a.md was not created",
    );
    assert.equal("vendor-link/a.md" in s.disk, false);
  } finally {
    await close(s, page);
  }
});

test("REQ-166 SCN-496: Open in terminal on packages/core, Copy path on its index.ts", async () => {
  const s = await sprich();
  fs.mkdirSync(path.join(s.projectDir, "packages", "core"), { recursive: true });
  const page = await open(s);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  try {
    await explorer(page);
    await openFolder(page, "packages");
    await menu(page, "packages/core", "open-terminal");
    const id = await page.waitForSelector('.term-tab[aria-selected="true"][data-terminal^="t"]');
    const tid = (await id.getAttribute("data-terminal"))!;
    await page.click(`.xterm-host[data-terminal="${tid}"] .xterm`);
    await page.keyboard.type(WIN ? "Get-Location" : "pwd");
    await page.keyboard.press("Enter");
    const start = Date.now();
    for (;;) {
      if (/core/.test(await termText(page, tid))) break;
      if (Date.now() - start > 20_000) throw new Error(await termText(page, tid));
      await page.waitForTimeout(100);
    }
    await openFolder(page, "packages/core");
    await openFolder(page, "packages/core/src");
    await menu(page, "packages/core/src/index.ts", "copy-path");
    assert.equal(
      await page.evaluate(() => navigator.clipboard.readText()),
      "packages/core/src/index.ts",
    );
  } finally {
    await close(s, page);
  }
});

// ── REQ-167 ─────────────────────────────────────────────────────────────

test("REQ-167 SCN-497: REQ-031 filtered — its two files in their opened folders; cleared, packages/core open again alone", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await explorer(page);
    await openFolder(page, "packages");
    await openFolder(page, "packages/core");
    await page.fill(".explorer .filter", "REQ-031");
    await page.waitForSelector(row("test/pedidos/REQ-031.test.ts"));
    const files = (await rows(page)).filter((p) => p && /\.\w+$/.test(p));
    assert.deepEqual(files, ["features/pedidos/REQ-031.feature", "test/pedidos/REQ-031.test.ts"]);
    await page.fill(".explorer .filter", "");
    await page.waitForSelector(row("packages/core/src"));
    const open_ = await page.$$eval('.explorer .row[aria-expanded="true"]', (els) =>
      els.map((e) => e.getAttribute("data-path")),
    );
    assert.deepEqual(open_, ["packages", "packages/core"]);
  } finally {
    await close(s, page);
  }
});

test("REQ-167 SCN-498: node_modules, apps/web/dist and .idea — never shown, never matched", async () => {
  const s = await studio({
    files: {
      ".gitignore": ".idea/\n*.log\n",
      "index.ts": "",
      "src/index.ts": "",
      "node_modules/x/index.js": "",
      "apps/web/dist/index.js": "",
      "apps/web/src/index.ts": "",
      ".idea/index.xml": "",
    },
  });
  const page = await open(s);
  try {
    await explorer(page);
    const top = await rows(page);
    for (const p of ["node_modules", ".idea"]) assert.ok(!top.includes(p), p);
    await page.fill(".explorer .filter", "index");
    await page.waitForSelector(row("src/index.ts"));
    const all = await rows(page);
    assert.deepEqual(
      all.filter((p) => p?.endsWith("index.ts") || p?.endsWith(".js") || p?.endsWith(".xml")),
      ["apps/web/src/index.ts", "src/index.ts", "index.ts"],
    );
  } finally {
    await close(s, page);
  }
});

// ── REQ-168 ─────────────────────────────────────────────────────────────

test('REQ-168 SCN-499: in Spanish, the "?" beside Eliminar — to the trash after a confirmation, nothing else, no commit', async () => {
  const s = await sprich();
  const page = await open(s, { lang: "es" });
  try {
    await explorer(page);
    await openFolder(page, "docs");
    await page.click(row("docs/notes.md"), { button: "right" });
    await page.click('.ctx [data-act="file-delete"] + .hq');
    const help = page.locator('[role="dialog"] [data-action="file-delete"]');
    await help.waitFor();
    const text = await help.innerText();
    assert.match(text, /Mueve docs\/notes\.md a la papelera del sistema tras una confirmación/);
    assert.match(text, /no escribe nada más y no hace commit/);
    assert.ok("docs/notes.md" in s.disk);
  } finally {
    await close(s, page);
  }
});

test('REQ-168 SCN-500: the "?" in the Explorer\'s header — what the tree shows, M, U and A, the mark, writes only through its menu', async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await explorer(page);
    await page.click(".explorer .shead .hq");
    const text = await page.locator('[role="dialog"] [data-action="explorer"]').innerText();
    assert.match(text, /M is a modified file, U an untracked one, A one added to the index/);
    assert.match(text, /The orange mark is the specification/);
    assert.match(text, /the tree writes only through its menu/);
  } finally {
    await close(s, page);
  }
});

// ── REQ-169 ─────────────────────────────────────────────────────────────

const PEDIDOS = {
  changes: { changes: [{ id: "draft-pedidos" }] },
  questions: {
    questions: {
      open: [
        { id: "Q1", change: "draft-pedidos", text: "From what amount?", blocks: ["REQ-034"] },
        { id: "Q2", change: "draft-pedidos", text: "Until when?", blocks: ["REQ-031"] },
      ],
    },
  },
};
const PEDIDOS_HOME = [
  {
    id: "REQ-031",
    title: "Cancel an order",
    category: "WAITING_FOR_ANSWER",
    needs: null,
    change: "draft-pedidos",
  },
  {
    id: "REQ-034",
    title: "Free shipping",
    category: "WAITING_FOR_ANSWER",
    needs: null,
    change: "draft-pedidos",
  },
];

test("REQ-169 SCN-502: SPEC EXPLORER above, draft-pedidos with 2 questions, capabilities (4); MODULES with REQ-031 amber; the files below", async () => {
  const caps = Object.fromEntries(
    ["auth", "catalogo", "pagos", "pedidos"].map((c) => [
      `docs/specs/capabilities/${c}/spec.md`,
      "",
    ]),
  );
  const s = await sprich({
    files: { ...SPRICH, ...caps },
    sections: PEDIDOS,
    homeRequirements: PEDIDOS_HOME as never,
  });
  const page = await open(s);
  try {
    await explorer(page);
    const heads = await page.$$eval(".explorer .shead > span:first-child", (els) =>
      els.map((e) => (e as HTMLElement).innerText),
    );
    assert.deepEqual(heads, ["EXPLORER", "SPEC EXPLORER", "MODULES · REQUIREMENTS", "FILES"]);
    const spec = await page.locator('.explorer [data-section="spec"]').innerText();
    assert.match(spec, /spec\.md/);
    assert.match(spec, /docs\/brief\.md/);
    assert.match(spec, /draft-pedidos\s*2 questions/);
    assert.match(spec, /capabilities \(4\)/);
    const req = page.locator('.explorer [data-section="modules"] [data-req="REQ-031"]');
    assert.equal(await req.getAttribute("data-state"), "waiting");
    assert.equal(
      await req.locator(".rdot").evaluate((e) => getComputedStyle(e).backgroundColor),
      "rgb(227, 179, 65)",
    );
    assert.match(await page.locator('.explorer [data-section="modules"]').innerText(), /pedidos/);
    assert.ok(await page.locator(".explorer .tree .row").first().isVisible(), "the files below");
  } finally {
    await close(s, page);
  }
});

test("REQ-169 SCN-503: REQ-031 chosen from pedidos — its file open at its heading, the row current", async () => {
  const s = await sprich({ sections: PEDIDOS, homeRequirements: PEDIDOS_HOME as never });
  const page = await open(s);
  try {
    await explorer(page);
    await page.click('.explorer [data-req="REQ-031"]');
    await page.waitForSelector(`.tab[aria-selected="true"][title="${DELTA}"]`);
    await page.waitForFunction(
      () =>
        (window as any).__studio.monaco?.editor.getEditors()[0]?.getPosition()?.lineNumber === 5,
    );
    assert.equal(await page.getAttribute('.explorer [data-req="REQ-031"]', "aria-current"), "true");
  } finally {
    await close(s, page);
  }
});
