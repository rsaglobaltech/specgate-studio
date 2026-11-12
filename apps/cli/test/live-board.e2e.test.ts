/**
 * draft-live-polish in a real browser: Live as the "En vivo" board — the
 * harness's stages with ✓ ● ○ ✗ and their times, the header's counts, time,
 * tokens and cost, the queue with estimates, TERMINADOS (REQ-103) — and
 * SALIDA DEL AGENTE, one line per action, following the end (REQ-201). The
 * events are the harness's as specgate 0.34.0 wrote them building REQ-141.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { close, open, studio, type Page } from "./support.js";
import { PLAN, SETTINGS, buildAnswers } from "./build-support.js";

const text = async (page: Page, sel: string) => (await page.textContent(sel)) ?? "";
type Studio = Awaited<ReturnType<typeof studio>>;

/** The stages' rows of a requirement: their stage, mark and time. */
const stages = (page: Page, req: string) =>
  page.$$eval(`.lreq[data-req="${req}"] .lstep`, (rows) =>
    rows.map((r) => [
      r.getAttribute("data-kind"),
      r.getAttribute("data-result"),
      r.querySelector(".lstage")!.textContent,
      r.querySelector(".ltime")!.textContent,
    ]),
  );

/**
 * REQ-141 pressed in Build `ago` seconds ago, REQ-142 queued after it; the
 * host's clock is set back for the press, so "Rama creada" counts from then.
 */
async function pressed(ago: number, lang: "en" | "es" = "es") {
  const s = await studio({
    homeRequirements: SETTINGS as never,
    specgate: { ...buildAnswers("claude -p < {prompt_file}"), plan: PLAN },
  });
  const page = await open(s, { lang });
  await page.click('.sga[data-view="build"]');
  await page.waitForSelector('.breq[data-req="REQ-141"]');
  const real = Date.now;
  // The host's clock held at the press: "Rama creada" counts from exactly then.
  const at = real() / 1000 - ago;
  Date.now = () => at * 1000;
  try {
    await page.click('.breq[data-req="REQ-141"] [data-act="build"]');
    await page.waitForSelector('.bstarted[data-req="REQ-141"]');
  } finally {
    Date.now = real;
  }
  await page.click('.breq[data-req="REQ-142"] [data-act="build"]');
  await page.waitForSelector('.bstarted[data-req="REQ-142"][data-queued]');
  return { s, page, at };
}

/** What specgate writes for REQ-141 from `at`: the setup, 0,2 s after the press, in 4,5 s; the attempt. */
function setUp(s: Studio, at: number) {
  const e = (event: Record<string, unknown>) => s.events.append("REQ-141", event);
  const setup = "setup: npm ci --silent --no-audit --no-fund";
  e({ t: at + 0.2, type: "gate-start", stage: setup });
  e({ t: at + 4.7, type: "gate", stage: setup, result: "pass", ms: 4496 });
  return e;
}

test("REQ-103 SCN-305: Live during REQ-141 on the desktop — Rama creada ✓ 0,2 s, the setup ✓ 4,5 s, Agente escribiendo ● with its timer, the gate and apply ○, intento 1 de 3, REQ-142 queued ~6 min, the header's counts, time, tokens and cost", async () => {
  const { s, page, at } = await pressed(230);
  try {
    const e = setUp(s, at);
    // The agent has been writing for 3:41.
    const start = Date.now() / 1000 - 221;
    e({ t: start, attempt: 1, type: "attempt", state: "start" });
    e({ t: start + 1, attempt: 1, type: "usage", output: 881, context: 211_393 });
    e({
      t: start + 200,
      attempt: 1,
      type: "usage",
      final: true,
      input: 156,
      output: 63_684,
      cacheRead: 115_785,
      cacheWrite: 2_010,
      cost: 1.1,
    });
    await page.click('.sga[data-view="live"]');
    await page.waitForSelector(
      '.lreq[data-req="REQ-141"] .lstep[data-kind="agent"][data-result="running"]',
    );
    const rows = await stages(page, "REQ-141");
    assert.deepEqual(
      rows.map(([id, mark, name]) => [id, mark, name]),
      [
        ["branch", "done", "Rama creada"],
        ["setup", "done", "Setup"],
        ["agent", "running", "Agente escribiendo"],
        ["validate", "waiting", "Gate: validate"],
        ["tests", "waiting", "Gate: tests"],
        ["architecture", "waiting", "Gate: arquitectura"],
        ["apply", "waiting", "Aplicar · commit en su rama"],
      ],
    );
    assert.equal(rows[0]![3], "0,2 s");
    assert.equal(rows[1]![3], "4,5 s");
    assert.match(rows[2]![3]!, /^3:4\d$/, "the agent's timer, from its attempt's start");
    assert.match(
      await text(page, '.lstep[data-kind="agent"]'),
      /Agente escribiendo · test primero, después el código/,
    );
    assert.match(await text(page, '.lstep[data-kind="setup"]'), /npm ci --silent/);
    assert.equal(
      await text(page, '[data-testid="live-attempt"]'),
      "Construyendo REQ-141 · intento 1 de 3 · rama harness/REQ-141",
    );
    const queued = '[data-testid="live-queue"] li[data-req="REQ-142"]';
    assert.match(await text(page, queued), /REQ-142.*~6 min/);
    const bar = await text(page, '[data-testid="live-cost"]');
    assert.match(bar, /✓ 0 pasados/);
    assert.match(bar, /● 1 en curso/);
    assert.match(bar, /✗ 0 fallidos/);
    assert.match(await text(page, '[data-testid="live-elapsed"]'), /^3:5\d$/);
    assert.equal(await text(page, '[data-testid="live-tokens"]'), "182 k tokens");
    assert.match(bar, /1,10 \$/);
    // The timer advances every second.
    const before = rows[2]![3];
    await page.waitForFunction(
      (b) => document.querySelector('.lstep[data-kind="agent"] .ltime')?.textContent !== b,
      before,
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-103 SCN-306: Live opened in a second browser tab mid-build — the same stages, the agent at 3:41 and advancing, the queue, the header's counts, tokens and cost", async () => {
  const { s, page, at } = await pressed(230, "en");
  const second = await open(s, { lang: "en" });
  try {
    const e = setUp(s, at);
    e({ t: Date.now() / 1000 - 221, attempt: 1, type: "attempt", state: "start" });
    e({
      t: Date.now() / 1000 - 1,
      attempt: 1,
      type: "usage",
      final: true,
      input: 12_000,
      output: 1_500,
      cacheRead: 30_000,
      cacheWrite: 0,
      cost: 0.42,
    });
    for (const p of [page, second]) {
      await p.click('.sga[data-view="live"]');
      await p.waitForSelector('.lstep[data-kind="agent"][data-result="running"]');
    }
    const marks = async (p: Page) => (await stages(p, "REQ-141")).map((r) => r.slice(0, 3));
    assert.deepEqual(await marks(second), await marks(page));
    assert.equal((await marks(second))[0]![2], "Branch created");
    const time = await text(second, '.lstep[data-kind="agent"] .ltime');
    assert.match(time, /^3:4\d$/);
    await second.waitForFunction(
      (b) => document.querySelector('.lstep[data-kind="agent"] .ltime')?.textContent !== b,
      time,
    );
    assert.match(await text(second, '[data-testid="live-queue"] li[data-req="REQ-142"]'), /~6 min/);
    assert.match(await text(second, '[data-testid="live-cost"]'), /● 1 running/);
    assert.equal(await text(second, '[data-testid="live-tokens"]'), "44 k tokens");
    assert.match(await text(second, '[data-testid="live-cost"]'), /\$0\.42/);
  } finally {
    await second.close();
    await close(s, page);
  }
});

test("REQ-103 SCN-612: the first seconds are never empty on the desktop — Rama creada as soon as Build is pressed, then ✓ with the setup ● and its timer", async () => {
  const { s, page, at } = await pressed(3);
  try {
    await page.click('.sga[data-view="live"]');
    await page.waitForSelector(
      '.lreq[data-req="REQ-141"] .lstep[data-kind="branch"][data-result="running"]',
    );
    assert.equal(await page.$('text="No se está construyendo ningún requisito."'), null);
    const setup = "setup: npm ci --silent --no-audit --no-fund";
    s.events.append("REQ-141", { t: at + 0.2, type: "gate-start", stage: setup });
    await page.waitForSelector('.lstep[data-kind="setup"][data-result="running"]');
    const rows = await stages(page, "REQ-141");
    assert.deepEqual(
      rows.map(([id, mark]) => [id, mark]),
      [
        ["branch", "done"],
        ["setup", "running"],
        ["agent", "waiting"],
        ["validate", "waiting"],
        ["tests", "waiting"],
        ["architecture", "waiting"],
        ["apply", "waiting"],
      ],
    );
    assert.match(rows[1]![3]!, /^0:0\d$/, "the setup's timer");
    assert.equal(await page.$('text="No se está construyendo ningún requisito."'), null);
  } finally {
    await close(s, page);
  }
});

test("REQ-103 SCN-613: in the browser, REQ-141 passed in 9 min for 0,57 $ under TERMINADOS, REQ-142's Gate: tests ✗ with its time, and intento 2 de 3 starting", async () => {
  const { s, page, at } = await pressed(560);
  try {
    const e = setUp(s, at);
    e({ t: at + 10, attempt: 1, type: "attempt", state: "start" });
    e({ t: at + 400, attempt: 1, type: "usage", final: true, input: 1, output: 1, cost: 0.57 });
    e({ t: at + 540, attempt: 1, type: "attempt", state: "end", result: "pass" });
    s.harness.finish(0, { results: [{ requirement: "REQ-141", result: "pass" }] });
    await page.click('.sga[data-view="live"]');
    await page.waitForSelector('.live[data-building="REQ-142"]');
    const t = Date.now() / 1000;
    const f = (event: Record<string, unknown>) => s.events.append("REQ-142", event);
    f({ t, attempt: 1, type: "attempt", state: "start" });
    f({ t: t + 1, attempt: 1, type: "gate-start", stage: "test command: npm test" });
    f({
      t: t + 8,
      attempt: 1,
      type: "gate",
      stage: "test command: npm test",
      result: "fail",
      ms: 7000,
      pass: 3,
      fail: 1,
    });
    f({ t: t + 8, attempt: 1, type: "attempt", state: "end", result: "fail", stage: "gate" });
    f({ t: t + 9, attempt: 2, type: "attempt", state: "start" });
    await page.waitForSelector('.lreq[data-req="REQ-142"][data-attempt="2"]');
    assert.match(await text(page, '[data-finished="REQ-141"]'), /✓\s*REQ-141 · 9 min · 0,57 \$/);
    assert.match(await text(page, '[data-testid="live-cost"]'), /✓ 1 pasados/);
    assert.match(
      await text(page, '.lreq[data-req="REQ-142"] .lattempts [data-attempt="1"]'),
      /✗\s*intento 1 · falló en tests · 8 s/,
    );
    assert.match(await text(page, '[data-testid="live-attempt"]'), /intento 2 de 3/);
    assert.equal(
      await page.getAttribute('.lreq[data-req="REQ-142"] .lstep[data-kind="tests"]', "data-result"),
      "waiting",
    );
    s.harness.finish(1, { results: [{ requirement: "REQ-142", result: "fail" }] });
  } finally {
    await close(s, page);
  }
});

/** The log's rows as the Developer reads them: time, verb, target and what follows. */
const logRows = (page: Page) =>
  page.$$eval('[data-testid="live-output"] li[data-kind] .lrow', (rows) =>
    rows.map((r) =>
      [...r.children]
        .map((c) => c.textContent ?? "")
        .join(" ")
        .trim(),
    ),
  );

test("REQ-201 SCN-601: on the desktop, the agent's actions on REQ-141 — read, edit +42, run ✗ 1 failing, run ✓ 3 passing — one timestamped line each, no raw shell row", async () => {
  const { s, page } = await pressed(10);
  try {
    const t = Math.floor(Date.now() / 1000);
    const step = (x: Record<string, unknown>) =>
      s.events.append("REQ-141", { attempt: 1, type: "step", result: "ok", ...x });
    s.events.append("REQ-141", { t, attempt: 1, type: "attempt", state: "start" });
    s.events.append("REQ-141", { t, attempt: 1, type: "message", text: "Reading the feature" });
    step({ t: t + 1, kind: "read", tool: "Read", target: "features/auth/REQ-012.feature" });
    step({
      t: t + 2,
      kind: "edit",
      tool: "Edit",
      target: "packages/core/test/auth/SignOut.test.ts",
      added: 42,
    });
    step({
      t: t + 3,
      kind: "test",
      tool: "Bash",
      target: "pnpm test SignOut",
      result: "error",
      pass: 0,
      fail: 1,
    });
    step({ t: t + 4, kind: "test", tool: "Bash", target: "pnpm test SignOut", pass: 3, fail: 0 });
    await page.click('.sga[data-view="live"]');
    await page.waitForSelector('[data-testid="live-output"] li[data-kind="run"][data-result="ok"]');
    const hms = (x: number) => {
      const d = new Date(x * 1000);
      return [d.getHours(), d.getMinutes(), d.getSeconds()]
        .map((n) => String(n).padStart(2, "0"))
        .join(":");
    };
    assert.deepEqual(await logRows(page), [
      `${hms(t + 1)} read features/auth/REQ-012.feature`,
      `${hms(t + 2)} edit packages/core/test/auth/SignOut.test.ts +42`,
      `${hms(t + 3)} run pnpm test SignOut ✗ 1 failing`,
      `${hms(t + 4)} run pnpm test SignOut ✓ 3 passing`,
    ]);
    assert.equal(
      await text(page, '[data-testid="live-follow"]'),
      "sigue el final · sube para pausar",
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-201 SCN-616: on the desktop with specgate 0.34.0 — the edit with its lines, the run ✗ with no count, and Gate: tests with its 4 passing", async () => {
  const { s, page } = await pressed(10);
  try {
    const t = Math.floor(Date.now() / 1000);
    const e = (x: Record<string, unknown>) => s.events.append("REQ-141", { attempt: 1, ...x });
    e({ t, type: "attempt", state: "start" });
    // As specgate 0.34.0 wrote them building REQ-141 (fixtures/REQ-141.jsonl).
    e({
      t: t + 1,
      type: "step",
      kind: "edit",
      tool: "Edit",
      target: "packages/core/src/domain/help.ts",
      started: t + 1,
      ended: t + 1,
      result: "ok",
      added: 24,
      removed: 4,
    });
    e({
      t: t + 2,
      type: "step",
      kind: "test",
      tool: "Bash",
      target: "npm test",
      started: t + 2,
      ended: t + 2,
      result: "error",
    });
    e({ t: t + 3, type: "gate-start", stage: "test command: npm test" });
    e({
      t: t + 5,
      type: "gate",
      stage: "test command: npm test",
      result: "pass",
      pass: 4,
      fail: 0,
      ms: 109762,
    });
    await page.click('.sga[data-view="live"]');
    await page.waitForSelector('.lstep[data-kind="tests"][data-result="done"]');
    const rows = await logRows(page);
    assert.match(rows[0]!, / edit packages\/core\/src\/domain\/help\.ts \+24$/);
    assert.match(rows[1]!, / run npm test ✗$/, "no failing count specgate did not give");
    assert.match(
      await text(page, '.lstep[data-kind="tests"]'),
      /Gate: tests · npm test · 4 passing/,
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-201 SCN-602: in the browser, scrolled up the log pauses and offers to go back; back at the end it follows again", async () => {
  const { s, page } = await pressed(10, "es");
  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    const t = Math.floor(Date.now() / 1000);
    s.events.append("REQ-141", { t, attempt: 1, type: "attempt", state: "start" });
    for (let i = 0; i < 60; i++)
      s.events.append("REQ-141", {
        t: t + 1 + i / 100,
        attempt: 1,
        type: "step",
        kind: "read",
        tool: "Read",
        target: `src/f${i}.ts`,
        result: "ok",
      });
    await page.click('.sga[data-view="live"]');
    await page.waitForSelector('[data-testid="live-output"] li:has-text("src/f59.ts")');
    const log = '[data-testid="live-output"]';
    const atEnd = () =>
      page.$eval(log, (el) => el.scrollHeight - el.scrollTop - el.clientHeight <= 24);
    await page.waitForFunction((sel) => {
      const el = document.querySelector(sel)!;
      return el.scrollHeight - el.scrollTop - el.clientHeight <= 24;
    }, log);
    assert.ok(await page.$eval(log, (el) => el.scrollHeight > el.clientHeight), "it scrolls");
    await page.$eval(log, (el) => {
      el.scrollTop = 0;
      el.dispatchEvent(new Event("scroll"));
    });
    await page.waitForSelector('[data-testid="live-follow"][data-paused]');
    assert.equal(await text(page, '[data-testid="live-follow"]'), "en pausa · volver al final ↓");
    s.events.append("REQ-141", {
      t: t + 2,
      attempt: 1,
      type: "step",
      kind: "read",
      tool: "Read",
      target: "src/new-a.ts",
      result: "ok",
    });
    s.events.append("REQ-141", {
      t: t + 2,
      attempt: 1,
      type: "step",
      kind: "read",
      tool: "Read",
      target: "src/new-b.ts",
      result: "ok",
    });
    await page.waitForSelector(`${log} li:has-text("src/new-b.ts")`);
    assert.equal(await page.$eval(log, (el) => el.scrollTop), 0, "it stays where it was");
    await page.click('[data-testid="live-follow"][data-paused]');
    await page.waitForSelector('[data-testid="live-log"][data-following]');
    assert.ok(await atEnd(), "back at the end");
    assert.equal(
      await text(page, '[data-testid="live-follow"]'),
      "sigue el final · sube para pausar",
    );
    s.events.append("REQ-141", {
      t: t + 3,
      attempt: 1,
      type: "step",
      kind: "read",
      tool: "Read",
      target: "src/new-c.ts",
      result: "ok",
    });
    await page.waitForSelector(`${log} li:has-text("src/new-c.ts")`);
    await page.waitForFunction((sel) => {
      const el = document.querySelector(sel)!;
      return el.scrollHeight - el.scrollTop - el.clientHeight <= 24;
    }, log);
  } finally {
    await close(s, page);
  }
});

test("REQ-201 SCN-603: in the browser, a 300-character command is one row `run ls …`, whole in its hover, and whole below the row once expanded", async () => {
  const { s, page } = await pressed(10, "en");
  try {
    const t = Math.floor(Date.now() / 1000);
    const command = `ls packages/* apps/* -d; ${"grep -rn settings packages/core/src apps/ui/src | head -40; ".repeat(5)}cat harness.config.yaml`;
    assert.ok(command.length >= 300, String(command.length));
    s.events.append("REQ-141", { t, attempt: 1, type: "attempt", state: "start" });
    s.events.append("REQ-141", {
      t: t + 1,
      attempt: 1,
      type: "step",
      kind: "shell",
      tool: "Bash",
      target: command,
      result: "ok",
    });
    await page.click('.sga[data-view="live"]');
    const row = '[data-testid="live-output"] li[data-kind="run"]';
    await page.waitForSelector(row);
    const one = await page.$eval(`${row} .lrow`, (el) => el.getBoundingClientRect().height);
    assert.ok(one <= 24, `one row, ${one}px`);
    assert.match((await logRows(page))[0]!, / run ls packages\//);
    assert.equal(await page.getAttribute(row, "title"), command);
    assert.ok(
      await page.$eval(`${row} .ltarget`, (el) => el.scrollWidth > el.clientWidth),
      "cut with …",
    );
    await page.click(row);
    assert.equal(await text(page, `${row} .lfull`), command);
    assert.equal(await page.getAttribute(row, "aria-expanded"), "true");
  } finally {
    await close(s, page);
  }
});
