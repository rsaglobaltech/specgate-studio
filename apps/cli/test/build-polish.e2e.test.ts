/**
 * draft-live-polish in a real browser: Build's list with each title and its
 * estimate below it, REQ-000 only when named (REQ-101); the commit's message
 * labelled, Confirm saying why it waits (REQ-102); "Configurar agente" and
 * Build following harness.config.yaml (REQ-203); the agent panel reopened
 * from the activity bar, the status bar, Ctrl/Cmd+Alt+B and the palette (REQ-204).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { MOD, close, open, openFromExplorer, studio, type Page } from "./support.js";
import { PLAN, SETTINGS, buildAnswers } from "./build-support.js";

const row = (req: string) => `.breq[data-req="${req}"]`;
const text = async (page: Page, sel: string) => (await page.textContent(sel)) ?? "";
const box = (page: Page, sel: string) =>
  page.$eval(sel, (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, bottom: r.bottom };
  });

/** The studio's draft-settings, its agent `claude` unless said otherwise. */
const settings = (agent: string | null = "claude -p < {prompt_file}", over = {}) =>
  studio({
    homeRequirements: SETTINGS as never,
    specgate: { ...buildAnswers(agent), plan: PLAN },
    ...over,
  });

async function build(page: Page) {
  await page.click('.sga[data-view="build"]');
  await page.waitForSelector(".breq");
}

/** The side panel scrolls no way but down: nothing wider than itself (REQ-202). */
const noSideways = (page: Page, sel: string) =>
  page.$eval(sel, (el) => el.scrollWidth <= el.clientWidth);

test('REQ-101 SCN-301: Build on the desktop at 1280×800 — "141 · A settings editor with search, and two scopes: project and user" with "~6 min" below it and `claude`, no horizontal scroll', async () => {
  const s = await settings();
  const page = await open(s);
  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    await build(page);
    const r141 = row("REQ-141");
    assert.equal(
      (await text(page, `${r141} .rid`)) + " · " + (await text(page, `${r141} .name`)),
      "REQ-141 · A settings editor with search, and two scopes: project and user",
    );
    assert.match(await page.innerText(`${r141} .rid`), /141$/);
    assert.equal(await page.innerText(`${r141} .best [aria-hidden]`), "~6 min");
    const name = await box(page, `${r141} .name`);
    const best = await box(page, `${r141} .best`);
    assert.ok(name.w > 120, `the title has the row's width, ${name.w}px`);
    assert.ok(best.y >= name.bottom - 1, "the estimate below the title");
    assert.ok(await noSideways(page, ".split.build > .side"), "no horizontal scroll");
    assert.match(await text(page, '[data-testid="build-agent"]'), /claude/);
  } finally {
    await close(s, page);
  }
});

test('REQ-101 SCN-302: Build in the browser with no agent set — REQ-141 with its title and estimate below it, no agent, and "Configurar agente"', async () => {
  const s = await settings(null);
  const page = await open(s, { lang: "es" });
  try {
    await build(page);
    assert.match(await page.innerText(`${row("REQ-141")} .name`), /A settings editor/);
    assert.equal(await page.innerText(`${row("REQ-141")} .best [aria-hidden]`), "~6 min");
    assert.equal(await page.getAttribute(`${row("REQ-141")} .bagent`, "data-agent"), "");
    assert.equal(
      await text(page, '[data-testid="build-agent"] [data-act="set-up-agent"]'),
      "Configurar agente",
    );
    assert.deepEqual(s.runs, []);
  } finally {
    await close(s, page);
  }
});

test('REQ-101 SCN-608: on the desktop, REQ-000 is not in Build until "Construir REQ-000" is chosen in the palette, then listed and chosen', async () => {
  const s = await settings();
  const page = await open(s, { lang: "es" });
  try {
    await build(page);
    assert.ok(await page.$(row("REQ-141")));
    assert.equal(await page.$(row("REQ-000")), null, "the adoption baseline is not offered");
    await page.keyboard.press(`${MOD}+Shift+P`);
    await page.keyboard.type("Construir REQ-000");
    await page.waitForSelector('.palette li:has-text("Construir REQ-000")');
    await page.keyboard.press("Enter");
    await page.waitForSelector(`.breqs[data-group="ready"] ${row("REQ-000")}`);
    assert.equal(await page.isChecked(`${row("REQ-000")} input[type="checkbox"]`), true);
  } finally {
    await close(s, page);
  }
});

test('REQ-101 SCN-609: in the browser, REQ-000\'s own "▶ Construir" opens Build with REQ-000 listed and chosen, no other chosen', async () => {
  const spec = [
    "# Spec",
    "",
    "### Requirement: REQ-000 — Health baseline",
    "",
    "The system SHALL pass its own gate.",
    "",
    "### Requirement: REQ-141 — A settings editor",
    "",
    "The system SHALL edit settings.",
    "",
  ].join("\n");
  const s = await settings(undefined, { files: { "spec.md": spec } });
  const page = await open(s, { lang: "es" });
  try {
    await openFromExplorer(page, "spec.md");
    await page.waitForFunction(
      () => document.querySelectorAll(".codelens-decoration a").length >= 10,
    );
    await page.click('.codelens-decoration >> nth=0 >> a:has-text("Construir")');
    await page.waitForSelector(`.breqs[data-group="ready"] ${row("REQ-000")}`);
    assert.equal(await page.isChecked(`${row("REQ-000")} input[type="checkbox"]`), true);
    assert.equal(await page.isChecked(`${row("REQ-141")} input[type="checkbox"]`), false);
  } finally {
    await close(s, page);
  }
});

/** Build waiting on the demo's 10 uncommitted files: `.claude/commands` and one more (A12). */
const TEN = [
  ...Array.from({ length: 9 }, (_, i) => `.claude/commands/specgate/c${i}.md`),
  "CLAUDE.md",
];

test('REQ-102 SCN-610: in the browser, the commit\'s field labelled "Mensaje del commit", Confirm disabled with "Escribe un mensaje para confirmar" beside it until "Agent set up" is written', async () => {
  const s = await settings(undefined, { uncommitted: TEN });
  const page = await open(s, { lang: "es" });
  try {
    await build(page);
    await page.click(`${row("REQ-141")} [data-act="build"]`);
    await page.waitForSelector('[data-testid="build-waits"]');
    await page.click('[data-testid="build-waits"] [data-act="commit"]');
    const dialog = '[data-confirm="commit"]';
    await page.waitForSelector(dialog);
    assert.equal(await text(page, `${dialog} label`), "Mensaje del commit");
    assert.equal(
      await page.getAttribute(`${dialog} label`, "for"),
      await page.getAttribute(`${dialog} textarea`, "id"),
    );
    assert.equal(await page.isDisabled(`${dialog} [data-act="confirm"]`), true);
    assert.equal(
      await text(page, `${dialog} [data-testid="confirm-why"]`),
      "Escribe un mensaje para confirmar",
    );
    await page.fill(`${dialog} textarea`, "Agent set up");
    assert.equal(await page.isDisabled(`${dialog} [data-act="confirm"]`), false);
    assert.equal(await page.$(`${dialog} [data-testid="confirm-why"]`), null, "that line gone");
  } finally {
    await close(s, page);
  }
});

test('REQ-102 SCN-611: on the desktop in English, "Commit message" in view without scrolling, Confirm disabled with "Write a message to confirm"', async () => {
  const s = await settings(undefined, { uncommitted: TEN });
  const page = await open(s);
  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    await build(page);
    await page.click(`${row("REQ-141")} [data-act="build"]`);
    await page.waitForSelector('[data-testid="build-waits"]');
    await page.click('[data-testid="build-waits"] [data-act="commit"]');
    const dialog = '[data-confirm="commit"]';
    await page.waitForSelector(dialog);
    assert.equal(await text(page, `${dialog} label`), "Commit message");
    const field = await box(page, `${dialog} textarea`);
    const confirm = await box(page, `${dialog} [data-act="confirm"]`);
    assert.ok(field.y >= 0 && field.bottom <= 800, "the field in view");
    assert.ok(confirm.bottom <= 800, "Confirm in view");
    await page.waitForFunction(() => document.activeElement?.tagName === "TEXTAREA", null, {
      timeout: 2000,
    });
    assert.equal(
      await text(page, `${dialog} [data-testid="confirm-why"]`),
      "Write a message to confirm",
    );
  } finally {
    await close(s, page);
  }
});

/** specgate's `config list` as harness.config.yaml says it, changed by the test. */
function configured() {
  let agent: string | null = null;
  const answers = {
    ...buildAnswers(null),
    plan: PLAN,
    "config list": () => ({
      data: { config: { test_cmd: "npm test", ...(agent ? { agent } : {}) } },
      findings: [],
      exitCode: 0,
    }),
  };
  return { answers, set: (a: string) => (agent = a) };
}

test('REQ-203 SCN-606: on the desktop, "Configurar agente" confirmed runs `specgate agents init --tool claude` in the terminal, then Build names `claude` without a reload', async () => {
  const c = configured();
  const s = await studio({ homeRequirements: SETTINGS as never, specgate: c.answers });
  const page = await open(s, { lang: "es" });
  try {
    await build(page);
    await page.click('[data-act="set-up-agent"]');
    const dialog = '[data-confirm="set-up-agent"]';
    await page.waitForSelector(dialog);
    assert.match(await text(page, dialog), /¿Configurar Claude Code como agente\?/);
    assert.match(await text(page, dialog), /specgate agents init --tool claude/);
    assert.deepEqual(s.runs, [], "nothing runs before it is confirmed");
    await page.click(`${dialog} [data-act="confirm"]`);
    for (let i = 0; i < 100 && s.runs.length === 0; i++) await page.waitForTimeout(20);
    assert.deepEqual(s.runs, [["agents", "init", "--tool", "claude"]]);
    // specgate wrote harness.config.yaml: the watcher says so, and Build follows.
    c.set("claude --output-format stream-json -p < {prompt_file}");
    s.watcher.emit(s.projectDir, "harness.config.yaml");
    await page.waitForSelector('.build[data-agent="claude"]', { timeout: 1000 });
    assert.match(await text(page, '[data-testid="build-agent"]'), /claude/);
  } finally {
    await close(s, page);
  }
});

test('REQ-203 SCN-607: in the browser, "Configurar agente" cancelled runs nothing; set from the terminal, Build names it without a reload', async () => {
  const c = configured();
  const s = await studio({ homeRequirements: SETTINGS as never, specgate: c.answers });
  const page = await open(s, { lang: "es" });
  try {
    await build(page);
    await page.click('[data-act="set-up-agent"]');
    await page.click('[data-confirm="set-up-agent"] [data-act="cancel"]');
    await page.waitForSelector('[data-confirm="set-up-agent"]', { state: "detached" });
    assert.deepEqual(s.runs, []);
    c.set("claude -p < {prompt_file}");
    s.watcher.emit(s.projectDir, "harness.config.yaml");
    await page.waitForSelector('.build[data-agent="claude"]', { timeout: 1000 });
    assert.equal(
      await page.getAttribute('[data-testid="build-agent"] .field', "title"),
      "claude -p < {prompt_file}",
    );
    assert.equal(await page.$('[data-act="set-up-agent"]'), null);
  } finally {
    await close(s, page);
  }
});

test('REQ-204 SCN-614: on the desktop, the agent panel closed by its × reopens from "Agente" in the status bar, at its last width, the item marked open', async () => {
  const s = await settings();
  const page = await open(s, { lang: "es" });
  try {
    await page.waitForSelector(".agent");
    const width = (await box(page, ".agent")).w;
    await page.click('[data-testid="agent-hide"]');
    await page.waitForSelector(".agent", { state: "detached" });
    assert.equal(await page.getAttribute('[data-testid="status-agent"]', "aria-pressed"), "false");
    assert.equal(await text(page, '[data-testid="status-agent"]'), "Agente");
    await page.click('[data-testid="status-agent"]');
    await page.waitForSelector(".agent");
    assert.equal((await box(page, ".agent")).w, width, "at its last width");
    assert.equal(await page.getAttribute('[data-testid="status-agent"]', "aria-pressed"), "true");
  } finally {
    await close(s, page);
  }
});

test("REQ-204 SCN-615: in the browser, the activity bar's button opens it, closes it, and Ctrl/Cmd+Alt+B opens it again; its tooltip names Agente and the keys", async () => {
  const s = await settings();
  const page = await open(s, { lang: "es" });
  try {
    await page.waitForSelector(".agent");
    await page.click('[data-testid="agent-hide"]');
    await page.waitForSelector(".agent", { state: "detached" });
    const button = '.activity [data-panel="agent"]';
    assert.match((await page.getAttribute(button, "title")) ?? "", /^Agente: .*(Ctrl\+Alt\+B|⌘⌥B)/);
    await page.click(button);
    await page.waitForSelector(".agent");
    await page.click(button);
    await page.waitForSelector(".agent", { state: "detached" });
    await page.keyboard.press(`${MOD}+Alt+B`);
    await page.waitForSelector(".agent");
    // And the palette's entry.
    await page.keyboard.press(`${MOD}+Shift+P`);
    await page.keyboard.type("Mostrar u ocultar el agente");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".agent", { state: "detached" });
  } finally {
    await close(s, page);
  }
});
