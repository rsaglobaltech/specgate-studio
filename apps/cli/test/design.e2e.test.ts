/**
 * draft-design-conformance in a real browser: the boards' identity shipped
 * with the studio (REQ-171), a frame without empty panels (REQ-172), Home
 * (REQ-173) and an empty folder's Home (REQ-174), side-panel views (REQ-175),
 * the "?" and the palette under "[ UNDER THE HOOD ]" (REQ-176), tab types and
 * the breadcrumb (REQ-177), the states (REQ-178), the Help view (REQ-179).
 * The host is fed by fakes; the desktop scenarios run the same bundle.
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { withClaude } from "@specgate-studio/adapter-specgate-cli/testing";
import { serve } from "../src/index.js";
import { MOD, close, hidePanel, open, studio, type Page } from "./support.js";

import { R, sprich, SPRICH_REQS, Q1, Q2, Q4, shown, type Opts } from "./sprich.js";

/** sprich served again on a port: the host back after it stopped (REQ-178). */
async function sprichOn(port: number) {
  return (await sprich({ port })).host;
}

const css = (page: Page, sel: string, prop: string) =>
  page.$eval(sel, (e, p) => getComputedStyle(e).getPropertyValue(p as string), prop);

// ── REQ-171 ─────────────────────────────────────────────────────────────

test("REQ-171 SCN-511: Home with no network — Syne, IBM Plex Sans and Mono from the studio itself, the block shadow, 4 px corners", async () => {
  const s = await sprich();
  const page = await open(s);
  const outside: string[] = [];
  page.on("request", (r) => {
    if (!/^http:\/\/127\.0\.0\.1:\d+\//.test(r.url()) && !r.url().startsWith("data:"))
      outside.push(r.url());
  });
  try {
    await page.reload();
    await page.waitForSelector(".home .next");
    await page.evaluate(() => document.fonts.ready);
    const loaded = await page.evaluate(() =>
      [...document.fonts]
        .filter((f) => f.status === "loaded")
        .map((f) => `${f.family} ${f.weight}`),
    );
    for (const f of ['"Syne" 800', '"IBM Plex Sans" 400', '"IBM Plex Mono" 400'])
      assert.ok(
        loaded.some((l) => l.replace(/"/g, "") === f.replace(/"/g, "")),
        `${f} in ${loaded.join(", ")}`,
      );
    assert.match(await css(page, "h1", "font-family"), /^Syne/);
    assert.match(await css(page, ".brand", "font-family"), /^Syne/);
    assert.match(await css(page, ".next-cmd", "font-family"), /IBM Plex Mono/);
    assert.match(await css(page, "body", "font-family"), /^"IBM Plex Sans"/);
    assert.equal(await css(page, ".next", "box-shadow"), "rgba(255, 91, 31, 0.14) 8px 8px 0px 0px");
    assert.equal(await css(page, ".next", "border-radius"), "4px");
    assert.equal(await css(page, ".cards .card", "border-radius"), "4px");
    assert.deepEqual(outside, [], "no request left 127.0.0.1");
  } finally {
    await close(s, page);
  }
});

test("REQ-171 SCN-512: Questions in the browser — the boards' ground, bars, side panel, orange and status bar; the title in Syne", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await page.click('.sga[data-view="questions"]');
    await page.waitForSelector(".qdetail h2");
    assert.equal(await css(page, "body", "background-color"), "rgb(21, 22, 26)");
    assert.equal(await css(page, ".top", "background-color"), "rgb(17, 18, 21)");
    assert.equal(await css(page, ".activity", "background-color"), "rgb(17, 18, 21)");
    assert.equal(await css(page, ".content .side", "background-color"), "rgb(28, 29, 34)");
    assert.equal(await css(page, ".btn.pri", "background-color"), "rgb(255, 91, 31)");
    assert.equal(await css(page, ".status", "background-color"), "rgb(185, 61, 11)");
    assert.match(await css(page, ".qdetail h2", "font-family"), /^Syne/);
  } finally {
    await close(s, page);
  }
});

// ── REQ-172 ─────────────────────────────────────────────────────────────

test("REQ-172 SCN-513: Questions with nothing open — no tab strip, the bottom panel with its five tabs; the status bar says 2 open · 1 to confirm", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await page.click('.sga[data-view="questions"]');
    await page.waitForSelector('[data-testid="status-view"]');
    assert.equal(await page.$(".tabs"), null, "no tab strip");
    assert.equal(await page.$eval(".panel", (e) => (e as HTMLElement).hidden), false);
    assert.deepEqual(await page.$$eval(".panel .ptab", (els) => els.map((e) => e.textContent)), [
      "Terminal",
      "Gate",
      "Problems",
      "Agent output",
      "Traceability",
    ]);
    assert.equal(await page.textContent('[data-testid="status-view"]'), "2 open · 1 to confirm");
  } finally {
    await close(s, page);
  }
});

test('REQ-172 SCN-514: a green gate — the menu bar, "Gate green" in green, a primary Build; Terminal › New terminal opens the panel', async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    assert.deepEqual(
      await page.$$eval(".menubar .menu > button", (els) => els.map((e) => e.textContent)),
      ["File", "Spec", "Build", "Terminal", "Help"],
    );
    await page.click('.actions [data-act="check"]');
    await page.waitForFunction(
      () => document.querySelector('[data-testid="gate-pill"]')?.textContent === "Gate green",
    );
    assert.equal(await css(page, '[data-testid="gate-pill"]', "color"), "rgb(127, 220, 170)");
    assert.equal(await page.textContent('[data-testid="header-build"]'), "Build");
    assert.equal(
      await css(page, '[data-testid="header-build"]', "background-color"),
      "rgb(255, 91, 31)",
    );
    await page.click('.menubar [data-menu="terminal"]');
    await page.click('.menu-list [data-feature="terminal.new"]');
    await page.waitForSelector('.panel .term-tab[data-terminal^="t"]');
  } finally {
    await close(s, page);
  }
});

// ── REQ-173 ─────────────────────────────────────────────────────────────

test("REQ-173 SCN-515: sprich's Home — the next step as a sentence, four counters, the route, the modules, the actions", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await page.waitForSelector('[data-testid="next-title"]');
    assert.equal(
      await page.textContent('[data-testid="next-title"]'),
      "Answer 2 questions of the draft pedidos",
    );
    assert.match(
      (await page.textContent('[data-testid="next-why"]')) ?? "",
      /They block REQ-031 and REQ-034/,
    );
    assert.equal(await page.textContent('[data-testid="next-go"]'), "Answer now");
    assert.equal(await page.locator(".next .hq").count(), 1);
    const cards = await page.$$eval(".cards.four .card", (els) =>
      els.map((e) => [e.querySelector(".k")?.textContent, e.querySelector(".v")?.textContent]),
    );
    assert.deepEqual(cards.slice(0, 3), [
      ["Requirements", "24"],
      ["Built", "15"],
      ["Proven", "12"],
    ]);
    // What the agent spent, as usage (demo-findings REQ-211).
    assert.deepEqual(cards[3]![0], "Agent's usage");
    await page.waitForSelector('.step[data-step="answered"][data-state="current"]');
    assert.match(
      await page.innerText('.step[data-step="answered"]'),
      /Questions answered\s*2 open/,
    );
    assert.equal(await page.locator('.modules-card [data-module="pedidos"]').count(), 1);
    assert.deepEqual(
      await page.$$eval(".home > .actions .btn", (els) => els.map((e) => e.textContent)),
      ["Check the gate", "Doctor", "New change", "From a ticket", "Open terminal"],
    );
  } finally {
    await close(s, page);
  }
});

test('REQ-173 SCN-516: "Answer now" leads to Questions, Q1 of draft-pedidos selected', async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await page.click('[data-testid="next-go"]');
    await page.waitForSelector('.qrow[data-question="Q1"][aria-current="true"]');
    assert.match(await page.innerText(".qdetail"), /From what amount is shipping free\?/);
  } finally {
    await close(s, page);
  }
});

// ── REQ-174 ─────────────────────────────────────────────────────────────

/** An empty folder served for real, with recent projects in its own settings folder. */
async function emptyFolder() {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "sg-new-"));
  const dir = path.join(parent, "academia");
  fs.mkdirSync(dir);
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "sg-new-home-"));
  fs.writeFileSync(
    path.join(home, "recent-projects.json"),
    JSON.stringify([
      { path: "/Users/dev/mvp/sprich-platform", name: "sprich", openedAt: "2026-11-11T09:00:00Z" },
      { path: "/Users/dev/mvp/agentkit", name: "agentkit", openedAt: "2026-11-10T09:00:00Z" },
    ]),
  );
  const host = await serve({ projectDir: dir, port: 0, home });
  return {
    host,
    url: host.url.replace(/^ws/, "http"),
    done: async (page?: Page) => {
      await close({ host }, page);
      for (const d of [parent, home]) fs.rmSync(d, { recursive: true, force: true });
    },
  };
}

test("REQ-174 SCN-517: an empty folder — the five questions as cards, Claude Code detected, Create the project and its command, Already have code? and the recent sprich and agentkit", async () => {
  const claude = withClaude(true);
  const s = await emptyFolder();
  const page = await open(s);
  try {
    await page.waitForSelector('[data-setup="create"]');
    assert.equal(await page.textContent('[data-setup="create"]'), "Create the project");
    for (const q of ["kind", "stack", "agent", "architecture"])
      assert.equal(await page.locator(`[data-q="${q}"] [aria-checked="true"]`).count(), 1, q);
    assert.match(
      await page.innerText('[data-q="agent"] [data-value="claude"]'),
      /Claude Code\s*detected/,
    );
    assert.match(await page.innerText(".setup-runs"), /specgate init/);
    assert.match(await page.innerText('[data-testid="have-code"]'), /Already have code\?/);
    assert.equal(await page.textContent('[data-act="open-folder"]'), "Open folder…");
    const recent = await page.$$eval('[data-testid="recent"] .recent-row span:first-child', (els) =>
      els.map((e) => e.textContent),
    );
    assert.deepEqual(recent, ["sprich", "agentkit"]);
  } finally {
    claude.restore();
    await s.done(page);
  }
});

test('REQ-174 SCN-518: "A service" chosen — its card marked orange, the other two not, the command below updated', async () => {
  const s = await emptyFolder();
  const page = await open(s);
  try {
    await page.waitForSelector('[data-q="kind"] [data-value="web"][aria-checked="true"]');
    const before = await page.textContent(".setup-config");
    await page.click('[data-q="kind"] [data-value="api"]');
    await page.waitForSelector('[data-q="kind"] [data-value="api"][aria-checked="true"]');
    assert.equal(
      await page.locator('[data-q="kind"] [aria-checked="true"]').count(),
      1,
      "one card of the question marked",
    );
    assert.equal(
      await css(page, '[data-q="kind"] [data-value="api"]', "border-top-color"),
      "rgb(255, 91, 31)",
    );
    await page.waitForFunction(
      (b) => document.querySelector(".setup-config")?.textContent !== b,
      before,
    );
    assert.match((await page.textContent(".setup-config")) ?? "", /PROJECT_TYPE: "backend"/);
  } finally {
    await s.done(page);
  }
});

// ── REQ-175 ─────────────────────────────────────────────────────────────

test("REQ-175 SCN-519: Questions grouped — OPEN · 2, TO CONFIRM IN THE SPEC · 1, FROM THE AGENT · 0; Q1 beside it", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await page.click('.sga[data-view="questions"]');
    await page.waitForSelector(".qdetail .qcard");
    assert.equal((await page.innerText(".split .shead")).split("\n")[0], "QUESTIONS");
    assert.deepEqual(
      await page.$$eval(".split .sgroup", (els) => els.map((e) => (e as HTMLElement).innerText)),
      ["OPEN · 2", "TO CONFIRM IN THE SPEC · 1", "FROM THE AGENT, WHILE IT BUILDS · 0"],
    );
    assert.equal(await page.getAttribute('.qrow[data-question="Q1"]', "aria-current"), "true");
    assert.equal(
      await page.getAttribute(".qdetail .qcard[data-state='open']", "data-question"),
      "Q1",
    );
    assert.equal(await page.locator('.qdetail [data-option="50 €"]').count(), 1);
  } finally {
    await close(s, page);
  }
});

test("REQ-175 SCN-520: Build — READY with checkboxes and estimates, WAITING with Q2, Build 1 requirement at its foot, REQ-012's five steps beside it", async () => {
  const reqs = [
    R("REQ-012", "Sign out", "NEEDS_EVERYTHING"),
    R("REQ-021", "Pay by card", "NEEDS_EVERYTHING"),
    { ...R("REQ-031", "Cancel an order", "WAITING_FOR_ANSWER", "draft-pedidos"), question: "Q2" },
  ];
  const s = await sprich({
    sections: { home: { total: 3, pending: 3, requirements: reqs, nextCommand: null } },
    homeRequirements: reqs as never,
  });
  const page = await open(s);
  try {
    await page.click('.sga[data-view="build"]');
    await page.waitForSelector('.breqs[data-group="ready"] .breq');
    assert.deepEqual(
      await page.$$eval(".split.build .sgroup", (els) =>
        els.map((e) => (e as HTMLElement).innerText),
      ),
      ["READY · APPROVED, NO QUESTIONS", "WAITING · CANNOT BE CHOSEN YET"],
    );
    assert.deepEqual(
      await page.$$eval('.breqs[data-group="ready"] .breq', (els) =>
        els.map((e) => e.getAttribute("data-req")),
      ),
      ["REQ-012", "REQ-021"],
    );
    assert.equal(
      await page.locator('.breqs[data-group="ready"] .breq input[type="checkbox"]').count(),
      2,
    );
    assert.match(await page.innerText('.breqs[data-group="waiting"] [data-req="REQ-031"]'), /Q2/);
    await page.check('.breq[data-req="REQ-012"] input[type="checkbox"]');
    assert.equal(await page.textContent('[data-act="build-chosen"]'), "Build 1 requirement");
    assert.deepEqual(
      await page.$$eval('.bplan[data-req="REQ-012"] .bstep', (els) =>
        els.map((e) => e.getAttribute("data-step")),
      ),
      ["branch", "agent", "gate", "apply", "commit"],
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-175 SCN-521: Changes — CHANGES with + New; draft-pedidos to review, add-coupons in progress, auth-reset ready; draft-pedidos beside it", async () => {
  const s = await sprich({
    specgate: {
      "change show auth-reset": {
        data: {
          change: {
            id: "auth-reset",
            config: { approved: "2026-11-09" },
            deltas: [{ capability: "auth", added: ["REQ-011 — Reset"] }],
          },
        },
        findings: [],
        exitCode: 0,
      },
    },
    sections: {
      home: {
        total: 2,
        pending: 1,
        requirements: [
          R("REQ-011", "Reset", "DONE", "auth-reset"),
          R("REQ-040", "A coupon", "NEEDS_TEST", "add-coupons"),
        ],
        nextCommand: null,
      },
    },
  });
  const page = await open(s);
  try {
    await page.click('.sga[data-view="changes"]');
    await page.waitForSelector('.cgroup[data-group="ready"] .crow');
    const head = (await page.innerText(".split .shead")).split("\n");
    assert.deepEqual(head, ["CHANGES", "+ New"]);
    const group = (g: string) =>
      page.$$eval(`.cgroup[data-group="${g}"] .crow`, (els) =>
        els.map((e) => e.getAttribute("data-change")),
      );
    assert.deepEqual(await group("review"), ["draft-pedidos"]);
    assert.deepEqual(await group("progress"), ["add-coupons"]);
    assert.deepEqual(await group("ready"), ["auth-reset"]);
    assert.match(await page.innerText('.cgroup[data-group="review"] .sgroup'), /^TO REVIEW/);
    assert.match(await page.innerText('.cgroup[data-group="progress"] .sgroup'), /^IN PROGRESS/);
    assert.match(await page.innerText('.cgroup[data-group="ready"] .sgroup'), /^READY TO ARCHIVE/);
    assert.equal(
      await page.getAttribute('.crow[data-change="draft-pedidos"]', "aria-current"),
      "true",
    );
    assert.equal(await page.textContent(".detail .detail-head h2"), "draft-pedidos");
  } finally {
    await close(s, page);
  }
});

test("REQ-175 SCN-522: Live in three columns — modules and queue left, REQ-012's steps and output middle, the agent's question under NEEDS ATTENTION right", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await page.click('.sga[data-view="live"]');
    await page.waitForSelector(".live3");
    const box = (sel: string) => page.$eval(sel, (e) => e.getBoundingClientRect().left);
    // Under the board's header (draft-live-polish REQ-103), the three columns.
    const left = await box(".live3 .lcols > .side:first-child");
    const middle = await box(".live3 .lcols > .lmid");
    const right = await box(".live3 .lcols > .side.right");
    assert.ok(left < middle && middle < right, `${left} < ${middle} < ${right}`);
    assert.match(
      await page.innerText(".live3 .lcols > .side:first-child"),
      /BY MODULE[\s\S]*QUEUE/,
    );
    assert.equal(await page.locator('.live3 .ltile-group[data-module="pedidos"]').count(), 1);
    assert.deepEqual(
      await page.$$eval(".ltabs [data-tab]", (els) => els.map((e) => e.textContent)),
      ["Steps", "Requirement", "Tests and files", "Attempts", "Agent"],
    );
    assert.ok(await page.locator('[data-testid="live-output"]').count());
    assert.match(
      await page.innerText(".live3 .lcols > .side.right"),
      /NEEDS ATTENTION[\s\S]*FINISHED/,
    );
  } finally {
    await close(s, page);
  }
});

// ── REQ-176 ─────────────────────────────────────────────────────────────

test('REQ-176 SCN-523: the "?" of "Ask for a change" — under it, [ UNDER THE HOOD ], `specgate change note`, a label and a text each; Escape closes it', async () => {
  const s = await sprich({ files: { [DELTA]: DELTA_TEXT, "spec.md": "# spec\n" } });
  const page = await open(s);
  try {
    await page.keyboard.press(`${MOD}+P`);
    await page.keyboard.type("pedidos/spec.md");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".codelens-decoration a");
    await page.locator(".codelens-decoration a", { hasText: "?" }).first().click();
    const pop = page.locator(".help.popover");
    await pop.waitFor();
    await page.waitForSelector(
      '.help.popover section[data-action="ask-change"] [data-part="command"]',
    );
    assert.match(await pop.innerText(), /\[ UNDER THE HOOD \]/);
    assert.match(
      await pop.locator('section[data-action="ask-change"] [data-part="command"] dd').innerText(),
      /specgate change note/,
    );
    assert.deepEqual(await pop.locator('section[data-action="ask-change"] dt').allInnerTexts(), [
      "What it does",
      "Command",
      "Files it changes",
      "What it does not do",
      "Next",
    ]);
    assert.equal(await page.$(".scrim"), null, "the window is not dimmed");
    assert.equal(await css(page, ".help.popover", "position"), "fixed");
    await page.keyboard.press("Escape");
    await page.waitForSelector(".help.popover", { state: "detached" });
  } finally {
    await close(s, page);
  }
});

test('REQ-176: the "?" beside Check opens under it, not in the middle of the window', async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    const q = page.locator(".home > .actions .hq").first();
    await q.click();
    await page.waitForSelector('.help.popover [data-part="next"]');
    const at = await q.boundingBox();
    const pop = await page.locator(".help.popover").boundingBox();
    assert.ok(at && pop);
    assert.ok(
      Math.abs(pop.y - (at.y + at.height + 8)) < 2 || pop.y + pop.height <= at.y,
      `${JSON.stringify(pop)} by ${JSON.stringify(at)}`,
    );
  } finally {
    await close(s, page);
  }
});

test('REQ-176 SCN-524: the palette, "ticket" — Open a change from a ticket under SPEC, its [ UNDER THE HOOD ] beside it', async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await page.keyboard.press(`${MOD}+Shift+P`);
    await page.keyboard.type("ticket");
    await page.waitForSelector('.ppane[data-feature="change.fromTicket"] [data-part="command"]');
    const area = page.locator('.parea[data-area="spec"]');
    assert.equal(await area.locator(".pgroup").innerText(), "SPEC");
    assert.equal(
      await area.locator('li[aria-selected="true"] span').first().textContent(),
      "Open a change from a ticket",
    );
    assert.match(await page.innerText(".ppane"), /\[ UNDER THE HOOD \]/);
    assert.match(
      await page.innerText('.ppane [data-part="command"] dd'),
      /specgate propose --from-ticket/,
    );
    assert.match(await page.innerText(".pfoot"), /↑↓ choose\s+Enter run\s+\? explain/);
    assert.equal(await page.textContent(".pinput .prompt"), "›");
  } finally {
    await close(s, page);
  }
});

// ── REQ-177 ─────────────────────────────────────────────────────────────

const DELTA = "docs/specs/changes/draft-pedidos/specs/pedidos/spec.md";
const DELTA_TEXT = [
  "# Delta — pedidos",
  "",
  "## ADDED Requirements",
  "",
  "### Requirement: REQ-031 — Cancel an order",
  "",
  "The system SHALL let a customer cancel an order until it is shipped.",
  "",
].join("\n");

test('REQ-177 SCN-525: REQ-031 from its module — the tab "REQ-031 · Cancel an order", type REQ, and the breadcrumb down to REQ-031', async () => {
  const s = await sprich({ files: { [DELTA]: DELTA_TEXT, "spec.md": "# spec\n" } });
  const page = await open(s);
  try {
    await page.click('.sga[data-view="explorer"]');
    await page.click('.explorer [data-module="pedidos"] [aria-expanded]');
    await page.click('.explorer [data-req="REQ-031"]');
    await page.waitForSelector(`.tab[aria-selected="true"][title="${DELTA}"]`);
    const tab = page.locator(`.tab[title="${DELTA}"]`);
    assert.equal(await tab.getAttribute("data-type"), "REQ");
    assert.match(await tab.innerText(), /REQ-031 · Cancel an order/);
    await page.waitForFunction(() =>
      document.querySelector('[data-testid="breadcrumb"]')?.textContent?.includes("REQ-031"),
    );
    assert.deepEqual(
      await page.$$eval('[data-testid="breadcrumb"] span', (els) => els.map((e) => e.textContent)),
      ["docs", "specs", "changes", "draft-pedidos", "specs", "pedidos", "REQ-031"],
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-177 SCN-526: a feature and a test — tabs typed FT and TS, the breadcrumb of the test", async () => {
  const s = await sprich({
    files: {
      "features/pedidos/REQ-031.feature": "Feature: x\n",
      "test/pedidos/CancelOrder.test.ts": "// REQ-031\n",
      "spec.md": "# spec\n",
    },
  });
  const page = await open(s);
  try {
    for (const f of ["features/pedidos/REQ-031.feature", "test/pedidos/CancelOrder.test.ts"]) {
      await page.keyboard.press(`${MOD}+P`);
      // The palette's field has the keyboard before typing, and lists the file before Enter.
      await page.waitForFunction(() => document.activeElement?.closest(".palette .pinput") != null);
      await page.keyboard.type(f);
      await page.waitForSelector(`.palette li[aria-selected="true"] >> text="${f}"`);
      await page.keyboard.press("Enter");
      await page.waitForSelector(`.tab[aria-selected="true"][title="${f}"]`);
    }
    assert.deepEqual(
      await page.$$eval(".tab", (els) =>
        els.map((e) => [e.getAttribute("data-type"), e.firstChild?.textContent]),
      ),
      [
        ["FT", "REQ-031.feature"],
        ["TS", "CancelOrder.test.ts"],
      ],
    );
    assert.deepEqual(
      await page.$$eval('[data-testid="breadcrumb"] span', (els) => els.map((e) => e.textContent)),
      ["test", "pedidos", "CancelOrder.test.ts"],
    );
  } finally {
    await close(s, page);
  }
});

// ── REQ-178 ─────────────────────────────────────────────────────────────

test(
  "REQ-178 SCN-527: the host stops and comes back — Reconnecting… and a grey status bar, then gone and Home read again",
  { timeout: 90_000 },
  async () => {
    const s = await sprich();
    const page = await open(s);
    const port = Number(new URL(s.url).port);
    let again: Awaited<ReturnType<typeof serve>> | null = null;
    try {
      await page.waitForSelector('[data-testid="next-title"]');
      await s.host.close();
      await page.waitForSelector('[data-testid="reconnecting"]', { timeout: 5000 });
      assert.match(
        await page.innerText('[data-testid="reconnecting"]'),
        /Reconnecting to the studio…/,
      );
      assert.equal(await css(page, ".status", "background-color"), "rgb(91, 86, 80)");
      // The host back on the same port: the banner goes, Home is read again.
      again = await sprichOn(port);
      await page.waitForSelector('[data-testid="reconnecting"]', {
        state: "detached",
        timeout: 15_000,
      });
      assert.equal(await css(page, ".status", "background-color"), "rgb(185, 61, 11)");
      await page.waitForSelector('[data-testid="next-title"]');
    } finally {
      await page.close();
      await again?.close();
    }
  },
);

test("REQ-178 SCN-528: Traceability cannot be read — [ COULD NOT READ ], traceability.md, line 48, Read again, Open line 48; Home and Questions still work", async () => {
  const s = await sprich({
    files: { "docs/specs/traceability.md": "# Matrix\n", "spec.md": "# spec\n" },
    sections: {
      matrix: new Error(
        "docs/specs/traceability.md:48: a row with 5 columns instead of 10",
      ) as never,
    },
  });
  const page = await open(s);
  try {
    await page.click('.sga[data-view="traceability"]');
    await page.waitForSelector('[data-testid="unreadable"]');
    const card = await page.innerText('[data-testid="unreadable"]');
    assert.match(card, /\[ COULD NOT READ \]/);
    assert.match(card, /traceability\.md · line 48/);
    assert.match(card, /The rest of the studio still works\./);
    assert.equal(await page.textContent('[data-act="read-again"]'), "Read again");
    assert.equal(await page.textContent('[data-act="open-line"]'), "Open line 48");
    await page.click('.sga[data-view="questions"]');
    await page.waitForSelector(".qdetail .qcard");
    await page.click('.sga[data-view="home"]');
    await page.waitForSelector('[data-testid="next-title"]');
  } finally {
    await close(s, page);
  }
});

test('REQ-178 SCN-529: an archive refused — "draft-pedidos was not archived", its reason and Retry, until closed', async () => {
  const s = await sprich({
    specgate: {
      "archive draft-pedidos --dry-run": {
        data: null,
        findings: [
          {
            code: "archive_not_applied",
            severity: "error",
            message: "REQ-031 is still Draft: apply it first.",
          },
        ],
        exitCode: 1,
      },
    },
  });
  const page = await open(s);
  try {
    await page.evaluate(() =>
      (window as any).__studio.rpc.ask("command.run", {
        name: "archive-preview",
        change: "draft-pedidos",
      }),
    );
    await page.waitForSelector('.notice[data-tone="refused"]');
    assert.equal(
      await page.textContent('.notice [data-part="title"]'),
      "draft-pedidos was not archived",
    );
    assert.match(await page.innerText(".notice"), /REQ-031 is still Draft/);
    await page.waitForTimeout(5500);
    assert.equal(await page.locator(".notice").count(), 1, "still there after 5 s");
    await page.click(".notice .notice-x");
    await page.waitForSelector(".notice", { state: "detached" });
  } finally {
    await close(s, page);
  }
});

test("REQ-178: a passed Check's notice goes by itself; Check reads Checking… while it runs", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await page.click('.actions [data-act="check"]');
    await page.waitForSelector('.notice[data-tone="ok"]');
    await page.waitForSelector(".notice", { state: "detached", timeout: 8000 });
  } finally {
    await close(s, page);
  }
});

test("REQ-178 SCN-530: a slow first read — [ LOADING ] and the section's shape, never a blank page", async () => {
  const s = await sprich({ slow: { matrix: 2000 } });
  const page = await s.newPage();
  try {
    await page.goto(s.url);
    await page.waitForSelector('[data-testid="loading"]', { timeout: 1900 });
    assert.match(await page.innerText('[data-testid="loading"]'), /\[ LOADING \]/);
    assert.ok((await page.locator('[data-testid="loading"] .bar-s').count()) >= 3);
    await page.waitForSelector('[data-testid="next-title"]', { timeout: 10_000 });
  } finally {
    await close(s, page);
  }
});

// ── REQ-179 ─────────────────────────────────────────────────────────────

test('REQ-179 SCN-531: Help, "archive" — Archive a change with `specgate archive` and its five parts; nothing that does not mention it', async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await page.click('.sga[data-view="help"]');
    await page.waitForSelector('.hentry[data-action="archive"]');
    await page.fill(".helpsearch", "archive");
    const entries = await page.$$eval(".hentry", (els) =>
      els.map((e) => [e.getAttribute("data-action"), (e as HTMLElement).innerText]),
    );
    const archive = entries.find(([a]) => a === "archive");
    assert.ok(archive, entries.map(([a]) => a).join(", "));
    assert.match(archive![1]!, /Archive a change/);
    assert.match(archive![1]!, /specgate archive/);
    assert.equal(await page.locator('.hentry[data-action="archive"] [data-part]').count(), 5);
    for (const [, text] of entries) assert.match(text!, /archiv/i);
    assert.equal(await page.locator('.hentry[data-action="copy-path"]').count(), 0);
  } finally {
    await close(s, page);
  }
});

test("REQ-179 SCN-532: Help in Spanish — grouped by area, each under [ POR DEBAJO ], in Spanish", async () => {
  const s = await sprich();
  const page = await open(s, { lang: "es" });
  try {
    await page.click('.sga[data-view="help"]');
    await page.waitForSelector('.hentry[data-action="check"]');
    assert.deepEqual(
      await page.$$eval(".harea .sgroup", (els) => els.map((e) => (e as HTMLElement).innerText)),
      ["SPEC", "CONSTRUIR Y COMPROBAR", "PROYECTO", "ARCHIVOS"],
    );
    const check = await page.innerText('.hentry[data-action="check"]');
    assert.match(check, /\[ POR DEBAJO \]/);
    assert.match(check, /Comprobar el gate/);
    assert.match(check, /Qué hace/);
  } finally {
    await close(s, page);
  }
});

// ── The editor as the shell board draws it (REQ-171, REQ-177, REQ-169) ──

const SPEC_WITH_Q = [
  "# Delta — pedidos",
  "",
  "### Requirement: REQ-031 — Cancel an order",
  "",
  "The system SHALL let a customer cancel an order until it is shipped.",
  "",
  "#### Scenario: SCN-031a — Cancelled before it ships",
  "",
  "- GIVEN a paid order not yet shipped",
  "- WHEN the customer cancels it",
  "",
  "<!-- specgate:trace status=Needs Clarification -->",
  "",
].join("\n");

const color = (page: Page, text: string) =>
  page.evaluate((t) => {
    const span = [...document.querySelectorAll(".monaco-editor .view-line span span")].find((s) =>
      s.textContent
        ?.replace(/\u00a0/g, " ")
        .trim()
        .startsWith(t),
    );
    if (!span) return null;
    const c = getComputedStyle(span);
    return [c.color, c.fontWeight];
  }, text);

test("REQ-171 SCN-511: the editor's theme — titles bold near-white, the marker orange, SHALL blue, GIVEN a keyword, the trace dim", async () => {
  const s = await sprich({ files: { [DELTA]: SPEC_WITH_Q, "spec.md": "# spec\n" } });
  const page = await open(s);
  try {
    // The panel folded to its tabs: the whole requirement in view, its trace too.
    await hidePanel(page);
    await page.keyboard.press(`${MOD}+P`);
    await page.keyboard.type("pedidos/spec.md");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".monaco-editor .view-line");
    // Tokenized: the requirement's title painted in its own colour.
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".monaco-editor .view-line span span")].some(
        (x) => x.textContent?.replace(/\u00a0/g, " ").trim() === "### Requirement:",
      ),
    );
    // Every line the test reads drawn first: the inline question may push them down a moment later.
    await page.waitForFunction(() => {
      const spans = [...document.querySelectorAll(".monaco-editor .view-line span span")].map(
        (x) => x.textContent?.replace(/\u00a0/g, " ").trim() ?? "",
      );
      return ["REQ-031 — Cancel an order", "SHALL", "GIVEN", "<!--"].every((t) =>
        spans.some((x) => x.startsWith(t)),
      );
    });
    // Tokenized down to the trace: Monaco colours the later lines in the background, a moment
    // after drawing them in the editor's plain foreground.
    await page.waitForFunction(() => {
      const plain = getComputedStyle(document.querySelector(".monaco-editor .view-lines")!).color;
      const trace = [...document.querySelectorAll(".monaco-editor .view-line span span")].find(
        (x) =>
          x.textContent
            ?.replace(/\u00a0/g, " ")
            .trim()
            .startsWith("<!--"),
      );
      return !!trace && getComputedStyle(trace).color !== plain;
    });
    assert.deepEqual(await color(page, "REQ-031 — Cancel an order"), ["rgb(236, 231, 222)", "700"]);
    assert.equal((await color(page, "###"))?.[0], "rgb(255, 138, 92)");
    assert.equal((await color(page, "SHALL"))?.[0], "rgb(108, 182, 255)");
    assert.equal((await color(page, "GIVEN"))?.[0], "rgb(180, 142, 255)");
    assert.equal((await color(page, "<!--"))?.[0], "rgb(107, 143, 113)");
  } finally {
    await close(s, page);
  }
});

test('REQ-169 REQ-177: the lens reads Build, Check, Trace with its count, Ask for a change and "?"; the inline question has its header, Another answer… and the footnote', async () => {
  const s = await sprich({
    files: { [DELTA]: SPEC_WITH_Q, "spec.md": "# spec\n" },
    questions: { open: [{ ...Q2, blocks: ["REQ-031"] }], answered: [] },
  });
  const page = await open(s);
  try {
    await page.click('.sga[data-view="explorer"]');
    await page.click('.explorer [data-module="pedidos"] [aria-expanded]');
    await page.click('.explorer [data-req="REQ-031"]');
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".codelens-decoration")].some((e) =>
        e.textContent?.includes("scenario"),
      ),
    );
    const lens = await page.evaluate(
      () =>
        [...document.querySelectorAll(".codelens-decoration")]
          .map((e) => e.textContent?.replace(/\u00a0/g, " "))
          .find((t) => t?.includes("scenario")) ?? "",
    );
    assert.match(lens, /Trace[\s|]*\(1 scenario, 0 tests\)/);
    const zone = '.qzone[data-question="Q2"]';
    await page.waitForSelector(zone);
    assert.equal(await page.textContent(`${zone} .qbox-open`), "Q2 open · blocks REQ-031");
    assert.equal(await page.textContent(`${zone} .qbox-src`), "questions.md · draft-pedidos");
    assert.equal(await page.textContent(`${zone} [data-act="other"]`), "Another answer…");
    assert.match(
      (await page.textContent(`${zone} .qbox-foot`)) ?? "",
      /Answer writes it in questions\.md \(specgate answer Q2\); then confirm the spec says it\./,
    );
    // The requirement in the editor, highlighted in its module; the spec explorer's root is sprich.
    assert.equal(await page.getAttribute('.explorer [data-req="REQ-031"]', "aria-current"), "true");
    assert.match(await page.innerText('.explorer [data-key="root"]'), /sprich/);
    // An unsaved tab shows its dot.
    await page.click(".monaco-editor .view-line >> nth=0");
    await page.keyboard.press("End");
    await page.keyboard.type(" x");
    await page.waitForSelector(".tab .dirty");
    assert.equal(await css(page, '.tab[data-type="REQ"] .dirty', "width"), "7px");
  } finally {
    await close(s, page);
  }
});
