/**
 * draft-build-live in a real browser: Build lists what is ready, its estimate
 * and who codes (REQ-101). The host is fed by fakes — specgate's `--json`
 * answers recorded — and the desktop scenarios run the same bundle (A12).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { close, open, studio, type Page, type StudioOptions } from "./support.js";

/** sprich's draft-pedidos (A1): REQ-030 ready, REQ-031 blocked by Q2, REQ-032 ready after it. */
export const SPRICH = [
  { id: "REQ-028", title: "Health", category: "DONE", needs: null },
  {
    id: "REQ-030",
    title: "Cancel an order",
    category: "NEEDS_EVERYTHING",
    needs: "a test and code",
    change: "draft-pedidos",
  },
  {
    id: "REQ-031",
    title: "Cancel until dispatch",
    category: "WAITING_FOR_ANSWER",
    needs: "an answer",
    change: "draft-pedidos",
    question: "Q2",
  },
  {
    id: "REQ-032",
    title: "Refund a cancelled order",
    category: "NEEDS_TEST",
    needs: "its test",
    change: "draft-pedidos",
  },
];

/** specgate's `--json` answers Build reads; `agent` is harness.config.yaml's. */
export function buildAnswers(agent: string | null): NonNullable<StudioOptions["specgate"]> {
  return {
    "harness report": {
      data: { report: { runs: 3, passed: 4, msPerDelivered: 720_000, estimatedCost: null } },
      findings: [],
      exitCode: 0,
    },
    "config list": {
      data: { config: { test_cmd: "npm test", ...(agent ? { agent } : {}) } },
      findings: [],
      exitCode: 0,
    },
    "change show draft-pedidos": {
      data: {
        change: {
          id: "draft-pedidos",
          config: { brief: "docs/brief.md", approved: "2026-11-10" },
          deltas: [],
        },
      },
      findings: [],
      exitCode: 0,
    },
  };
}

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
