/**
 * draft-build-live in a real browser: Build lists what is ready, its estimate
 * and who codes (REQ-101). The host is fed by fakes — specgate's `--json`
 * answers recorded — and the desktop scenarios run the same bundle (A12).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { close, open, studio, type Page } from "./support.js";
import { SPRICH, buildAnswers, files325 } from "./build-support.js";

const row = (req: string) => `.breq[data-req="${req}"]`;
const text = async (page: Page, sel: string) => (await page.textContent(sel)) ?? "";

async function build(page: Page) {
  await page.click('.sga[data-view="build"]');
  await page.waitForSelector(".breq");
}

test("REQ-101 SCN-301: Build on the desktop — REQ-030 with its estimate and `claude`, REQ-031 apart waiting for Q2", async () => {
  const s = await studio({
    homeRequirements: SPRICH as never,
    specgate: buildAnswers("claude -p < {prompt_file}"),
  });
  const page = await open(s);
  try {
    await build(page);
    assert.deepEqual(
      await page.$$eval('.breqs[data-group="ready"] .breq', (els) =>
        els.map((e) => e.getAttribute("data-req")),
      ),
      ["REQ-030", "REQ-032"],
    );
    const ready = await text(page, row("REQ-030"));
    assert.match(ready, /REQ-030\s*Cancel an order/);
    assert.match(ready, /about 12 min/, "its estimate");
    assert.equal(await page.getAttribute(`${row("REQ-030")} .bagent`, "data-agent"), "claude");
    assert.match(await text(page, '[data-testid="build-agent"]'), /claude/);
    // REQ-031 apart, waiting for Q2.
    assert.equal(await page.$(`.breqs[data-group="ready"] ${row("REQ-031")}`), null);
    assert.equal(
      await page.getAttribute(`.breqs[data-group="waiting"] ${row("REQ-031")}`, "data-why"),
      "question",
    );
    assert.match(await text(page, row("REQ-031")), /waits for the answer to Q2/);
    // Build only reads: nothing ran, nothing was written.
    assert.deepEqual(s.runs, []);
    assert.deepEqual(s.writes, []);
    assert.deepEqual(s.calls.map((c) => c.join(" ")).sort(), [
      "change show draft-pedidos",
      "config list",
      "harness report",
    ]);
  } finally {
    await close(s, page);
  }
});

test("REQ-101 SCN-302: Build in the browser with no agent set — REQ-030 with its estimate, no agent, and `specgate agents init --tool claude`", async () => {
  const s = await studio({ homeRequirements: SPRICH as never, specgate: buildAnswers(null) });
  const page = await open(s, { lang: "es" });
  try {
    await build(page);
    assert.match(await text(page, row("REQ-030")), /unos 12 min/);
    assert.equal(await page.getAttribute(`${row("REQ-030")} .bagent`, "data-agent"), "");
    assert.equal(
      await text(page, '[data-testid="set-agent"]'),
      "specgate agents init --tool claude",
    );
    assert.match(await text(page, '[data-testid="build-agent"]'), /No hay agente fijado/);
    // Its "?" explains `agents init`, running nothing.
    await page.click('[data-testid="build-agent"] .hq');
    await page.waitForSelector('.help [data-action="agents-init"]');
    assert.match(await text(page, ".help"), /specgate agents init --tool/);
    assert.deepEqual(s.runs, []);
  } finally {
    await close(s, page);
  }
});

test('REQ-102 SCN-303: sprich\'s 325 files on the desktop — grouped by folder before confirming, one commit with "Work in progress before building REQ-030", then REQ-030 builds', async () => {
  const s = await studio({
    homeRequirements: SPRICH as never,
    specgate: buildAnswers("claude -p < {prompt_file}"),
    uncommitted: files325(),
  });
  const page = await open(s);
  try {
    await build(page);
    await page.click(`${row("REQ-030")} [data-act="build"]`);
    await page.waitForSelector('[data-testid="build-waits"][data-req="REQ-030"]');
    const waits = await text(page, '[data-testid="build-waits"]');
    assert.match(waits, /Build waits: 325 uncommitted files that are not the specification/);
    assert.match(waits, /its own branch from the last commit/);
    assert.deepEqual(s.harness.started, [], "nothing builds while it waits");

    await page.click('[data-testid="build-waits"] [data-act="commit"]');
    await page.waitForSelector('[data-confirm="commit"]');
    // The 325 files by folder, before anything runs.
    assert.deepEqual(
      await page.$$eval('[data-confirm="commit"] .bgroups > li', (els) =>
        els.map((e) => [e.getAttribute("data-group"), e.getAttribute("data-files")]),
      ),
      [
        ["src/orders", "200"],
        ["src/web", "100"],
        ["test", "25"],
      ],
    );
    assert.equal(
      await page.isDisabled('[data-confirm="commit"] [data-act="confirm"]'),
      true,
      "no commit without a message",
    );
    assert.equal(s.git.commits.length, 0);
    await page.fill('[data-confirm="commit"] textarea', "Work in progress before building REQ-030");
    await page.click('[data-confirm="commit"] [data-act="confirm"]');

    await page.waitForSelector('.bstarted[data-req="REQ-030"]');
    assert.equal(s.git.commits.length, 1);
    assert.equal(s.git.commits[0]!.message, "Work in progress before building REQ-030");
    assert.equal(s.git.commits[0]!.files.length, 325);
    assert.deepEqual(s.harness.started, [
      ["harness", "run", "--req", "REQ-030", "--format", "json"],
    ]);
    assert.equal(await page.$('[data-testid="build-waits"]'), null);
    // The commit's notice says what it did and what it wrote.
    await page.waitForSelector(".notice[data-tone]");
    assert.match(await text(page, ".notice[data-tone]"), /committed the 325 files shown/);
  } finally {
    await close(s, page);
  }
});

test("REQ-102 SCN-304: stash cancelled in the browser — nothing is stashed, the files stay, and Build still says why it waits", async () => {
  const files = ["src/orders/cancel.ts", "README.md"];
  const s = await studio({
    homeRequirements: SPRICH as never,
    specgate: buildAnswers("claude -p < {prompt_file}"),
    uncommitted: files,
  });
  const page = await open(s, { lang: "es" });
  try {
    await build(page);
    await page.click(`${row("REQ-030")} [data-act="build"]`);
    await page.waitForSelector('[data-testid="build-waits"]');
    await page.click('[data-testid="build-waits"] [data-act="stash"]');
    await page.waitForSelector('[data-confirm="stash"]');
    assert.match(
      await text(page, '[data-confirm="stash"]'),
      /¿Guardar estos 2 archivos en el stash\?/,
    );
    await page.click('[data-confirm="stash"] [data-act="cancel"]');
    await page.waitForSelector('[data-confirm="stash"]', { state: "detached" });

    assert.equal(s.git.stashes, 0, "nothing is stashed");
    assert.deepEqual(await s.git.uncommitted(s.projectDir), files, "the files stay as they were");
    assert.match(
      await text(page, '[data-testid="build-waits"]'),
      /Construir espera: 2 archivos sin commit/,
    );
    assert.deepEqual(s.harness.started, []);
    // Ignore is offered, and says why it cannot run with specgate 0.33.2.
    assert.equal(await page.isDisabled('[data-testid="build-waits"] [data-act="ignore"]'), true);
    assert.match(await text(page, '[data-testid="ignore-unsupported"]'), /specgate 0\.33\.2/);
  } finally {
    await close(s, page);
  }
});
