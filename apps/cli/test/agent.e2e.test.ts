/**
 * The agent panel in a real browser (draft-workbench-v2 REQ-181 … REQ-183),
 * on fakes: specgate's `agent ask|apply|discard --json` answers are recorded,
 * as the fake agent's plan would come back — no agent runs, never a paid
 * one. The studio shows the plan and its diff and confirms it; the fake
 * `agent apply` writes the files, as specgate does — the studio never does.
 */
import test from "node:test";
import assert from "node:assert/strict";
import type { SpecgateAnswer } from "@specgate-studio/core";
import { close, open, untilTerm, type Page } from "./support.js";
import { sprich, type Opts } from "./sprich.js";

const REQUEST = "Que se pueda cancelar hasta 24 h antes del envío @REQ-031";
const ID = "20261112-101500-4bc1";
const SPEC = "docs/specs/changes/draft-pedidos/specs/pedidos/spec.md";
const QUESTIONS = "docs/specs/changes/draft-pedidos/questions.md";
const FEATURE = "features/pedidos/REQ-031.feature";

const diff = (path: string, before: string, after: string, add = false) =>
  [
    `diff --git a/${path} b/${path}`,
    add ? "new file mode 100644" : "index 1a9b641..d11ce12 100644",
    add ? "--- /dev/null" : `--- a/${path}`,
    `+++ b/${path}`,
    "@@ -1 +1 @@",
    ...(before ? [`-${before}`] : []),
    `+${after}`,
    "",
  ].join("\n");

/** The plan the fake agent's run answers: the board's three files (SCN-541). */
const PLAN = {
  id: ID,
  request: REQUEST,
  mode: "spec",
  created: "2026-11-12T10:15:00.000Z",
  files: [
    {
      path: SPEC,
      change: "modify",
      why: "",
      diff: diff(SPEC, "Until it ships.", "Until 24 h before it ships."),
    },
    {
      path: QUESTIONS,
      change: "modify",
      why: "Q2 respondida",
      diff: diff(QUESTIONS, "| Q2 | open |", "| Q2 | 24 h before it ships |"),
    },
    {
      path: FEATURE,
      change: "add",
      why: "SCN-031b",
      diff: diff(FEATURE, "", "Feature: Cancel an order", true),
    },
  ],
  then: ["specgate draft --check pedidos"],
  read: ["docs/brief.md § pedidos", QUESTIONS, SPEC],
  usage: { input: 2600, output: 500 },
};

const DISK = {
  "docs/brief.md": "# brief\n",
  [SPEC]: "Until it ships.\n",
  [QUESTIONS]: "| Q2 | open |\n",
  "spec.md": "# spec.md\n",
};

/** sprich with the fake agent's answers: its plan, then apply or discard. */
function withAgent(extra: Opts = {}) {
  const apply = (_: unknown, disk: Record<string, string>): SpecgateAnswer => {
    // specgate writes the plan, byte for byte: the studio never does.
    disk[SPEC] = "Until 24 h before it ships.\n";
    disk[QUESTIONS] = "| Q2 | 24 h before it ships |\n";
    disk[FEATURE] = "Feature: Cancel an order\n";
    return {
      data: {
        applied: {
          id: ID,
          written: [
            { path: SPEC, change: "modify" },
            { path: QUESTIONS, change: "modify" },
            { path: FEATURE, change: "add" },
          ],
          then: [{ command: "specgate draft --check pedidos", exit: 0, findings: [] }],
        },
      },
      findings: [],
      exitCode: 0,
    };
  };
  return sprich({
    files: { ...DISK },
    ...extra,
    specgate: {
      [`agent ask ${REQUEST} --plan`]: { data: { plan: PLAN }, findings: [], exitCode: 0 },
      [`agent apply ${ID}`]: apply,
      [`agent discard ${ID}`]: { data: { discarded: { id: ID } }, findings: [], exitCode: 0 },
      ...extra.specgate,
    },
  });
}

async function ask(page: Page, request: string) {
  await page.fill('[data-testid="agent-input"]', request);
  await page.keyboard.press("Escape");
  await page.click('[data-testid="agent-send"]');
}

const texts = (page: Page, sel: string) =>
  page.$$eval(sel, (els) => els.map((e) => (e as HTMLElement).innerText.trim()));

test('REQ-181 SCN-541: on the desktop, the request for REQ-031 — "[ PLAN · NADA ESCRITO AÚN ]" with M, M and + and "specgate draft --check pedidos" after; no file of sprich changed', async () => {
  const s = await withAgent();
  const page = await open(s, { lang: "es" });
  try {
    await page.waitForSelector('[data-testid="agent-panel"]');
    const before = JSON.stringify(s.disk);
    await ask(page, REQUEST);
    await page.waitForSelector('[data-testid="agent-plan"]');
    assert.equal(
      (await page.textContent('[data-testid="agent-request"]'))?.trim(),
      REQUEST,
      "the request on the right",
    );
    assert.equal(
      await page.textContent('[data-testid="agent-plan-title"]'),
      "[ PLAN · NADA ESCRITO AÚN ]",
    );
    assert.deepEqual(await texts(page, '[data-testid="agent-plan"] [data-file]'), [
      "M changes/draft-pedidos/specs/pedidos/spec.md",
      "M changes/draft-pedidos/questions.md (Q2 respondida)",
      "+ features/pedidos/REQ-031.feature (SCN-031b)",
    ]);
    assert.equal(
      await page.textContent('[data-testid="agent-then"] .mono'),
      "specgate draft --check pedidos",
    );
    assert.match(
      (await page.textContent('[data-testid="agent-then"]'))!,
      /^Después correré specgate draft --check pedidos\. No construye ni hace commit\.$/,
    );
    assert.deepEqual(s.writes, [], "no file of sprich written");
    assert.equal(JSON.stringify(s.disk), before, "no file of sprich changed");
    assert.ok(
      s.calls.some((c) => c.join(" ") === `agent ask ${REQUEST} --plan`),
      "specgate agent ask … --plan ran",
    );
  } finally {
    await close(s, page);
  }
});

test('REQ-181 SCN-542: in the browser, in English — the agent panel on the right, "AGENT" with claude and its "?", the input under it, the views between the side panel and it', async () => {
  const s = await withAgent();
  const page = await open(s);
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const v of ["home", "changes", "questions"]) {
      await page.click(`.sga[data-view="${v}"]`);
      await page.waitForSelector('[data-testid="agent-panel"]');
    }
    await page.waitForFunction(() =>
      document.querySelector('[data-testid="agent-who"]')?.textContent?.includes("claude"),
    );
    assert.equal(await page.textContent('[data-testid="agent-heading"]'), "AGENT");
    assert.equal(await page.textContent('[data-testid="agent-who"]'), "claude · spec mode");
    assert.equal(
      await page.getAttribute('[data-testid="agent-panel"] .hq', "aria-label"),
      "What the agent can do and what it cannot",
    );
    assert.equal(
      await page.textContent('[data-testid="agent-panel"] label[for="agent-input"]'),
      "Ask something about the spec; @ names a requirement or a file",
    );
    const box = async (sel: string) => (await (await page.$(sel))!.boundingBox())!;
    const agent = await box('[data-testid="agent-panel"]');
    const input = await box('[data-testid="agent-input"]');
    const main = await box(".ecol");
    assert.ok(agent.x + agent.width >= 1440 - 2, "at the right edge");
    assert.ok(main.x + main.width <= agent.x + 1, "the views left of it");
    assert.ok(input.y > agent.y + agent.height / 2, "the input under the plans");
    await page.click('[data-testid="agent-panel"] .hq');
    await page.waitForSelector(".help[role=dialog] >> text=specgate agent ask");
  } finally {
    await close(s, page);
  }
});

test('REQ-182 SCN-543: on the desktop, "Ver el diff y aplicar", the three diffs, confirmed — written by specgate, the notice names them and the check, Changes shows the diff under draft-pedidos', async () => {
  const s = await withAgent();
  const page = await open(s, { lang: "es" });
  try {
    await ask(page, REQUEST);
    await page.waitForSelector('[data-testid="agent-read"]');
    assert.equal(
      await page.textContent('[data-testid="agent-read"]'),
      "Leídos: brief.md § pedidos, questions.md, spec.md · 3,1 k tokens",
    );
    await page.click('[data-action="agent-apply"]');
    await page.waitForSelector('[data-testid="agent-diff"]');
    assert.deepEqual(
      await page.$$eval('[data-testid="agent-diff"] section', (els) =>
        els.map((e) => e.getAttribute("data-file")),
      ),
      [SPEC, QUESTIONS, FEATURE],
    );
    assert.ok(
      await page.$('[data-testid="agent-diff"] .add >> text=+Until 24 h before it ships.'),
      "the diff as specgate made it",
    );
    assert.ok(!s.calls.some((c) => c[1] === "apply"), "nothing applied before the confirmation");
    await page.click('[data-action="agent-confirm"]');
    await page.waitForSelector('.notice[data-tone="ok"] >> text=specgate agent apply');
    const notice = (await page.textContent(".notice"))!;
    for (const f of [SPEC, QUESTIONS, FEATURE]) assert.ok(notice.includes(f), `names ${f}`);
    assert.match(notice, /specgate draft --check pedidos/);
    assert.equal(s.disk[FEATURE], "Feature: Cancel an order\n", "written as the diff showed");
    assert.deepEqual(s.writes, [], "by specgate, never by the studio");
    await untilTerm(page, "specgate", /specgate agent apply 20261112-101500-4bc1/);
    await page.waitForSelector('[data-testid="agent-plan-title"] >> text=[ APLICADO ]');
    await page.click('.sga[data-view="changes"]');
    await page.click('.crow[data-change="draft-pedidos"]');
    await page.waitForSelector('[data-testid="agent-applied"] [data-file]');
    assert.deepEqual(
      await page.$$eval('[data-testid="agent-applied"] [data-file]', (els) =>
        els.map((e) => e.getAttribute("data-file")),
      ),
      [SPEC, QUESTIONS, FEATURE],
    );
  } finally {
    await close(s, page);
  }
});

test('REQ-182 SCN-544: in the browser, "Descartar" — the plan goes, no file of sprich is written, the notice says nothing was written', async () => {
  const s = await withAgent();
  const page = await open(s);
  try {
    const before = JSON.stringify(s.disk);
    await ask(page, REQUEST);
    await page.waitForSelector('[data-action="agent-discard"]');
    await page.click('[data-action="agent-discard"]');
    await page.waitForSelector(
      '[data-testid="agent-plan-title"] >> text=[ DISCARDED · NOTHING WRITTEN ]',
    );
    assert.equal(await page.$('[data-action="agent-apply"]'), null, "the plan goes");
    await page.waitForSelector('.notice[data-tone="ok"] >> text=specgate agent discard');
    assert.match((await page.textContent('.notice [data-part="wrote"]'))!, /No file was written/);
    assert.ok(s.calls.some((c) => c.join(" ") === `agent discard ${ID}`));
    assert.ok(!s.calls.some((c) => c[1] === "apply"));
    assert.equal(JSON.stringify(s.disk), before);
    assert.deepEqual(s.writes, []);
  } finally {
    await close(s, page);
  }
});

test("REQ-182 SCN-545: on the desktop, the diff seen and the confirmation cancelled — nothing written, the plan stays with its two buttons", async () => {
  const s = await withAgent();
  const page = await open(s, { lang: "es" });
  try {
    const before = JSON.stringify(s.disk);
    await ask(page, REQUEST);
    await page.click('[data-action="agent-apply"]');
    await page.waitForSelector('[data-testid="agent-diff"]');
    await page.click('[data-action="agent-cancel"]');
    await page.waitForSelector('[data-testid="agent-diff"]', { state: "detached" });
    assert.deepEqual(await texts(page, '[data-testid="agent-plan"] .actions button'), [
      "Ver el diff y aplicar",
      "Descartar",
    ]);
    assert.ok(!s.calls.some((c) => c[1] === "apply" || c[1] === "discard"));
    assert.equal(JSON.stringify(s.disk), before);
  } finally {
    await close(s, page);
  }
});

test('REQ-183 SCN-546: the Reviewer asks "¿Qué falta para aprobar pedidos?" in Spanish — the request on the right, the answer under it, the command in the terminal', async () => {
  const q = "¿Qué falta para aprobar pedidos?";
  const s = await withAgent({
    specgate: {
      [`agent ask ${q} --plan`]: {
        data: {
          plan: { ...PLAN, id: null, request: q, files: [], then: [], read: [SPEC] },
        },
        findings: [
          {
            severity: "info",
            code: "plan_empty",
            message: "The agent changed nothing: Q2 is open and blocks REQ-031.",
          },
        ],
        exitCode: 0,
      },
    },
  });
  const page = await open(s, { lang: "es" });
  try {
    assert.equal(
      await page.textContent('label[for="agent-input"]'),
      "Pide algo sobre la spec; @ nombra un requisito o un archivo",
    );
    await ask(page, q);
    await page.waitForSelector('[data-testid="agent-empty"]');
    assert.equal((await page.textContent('[data-testid="agent-request"]'))?.trim(), q);
    const term = await untilTerm(page, "specgate", /agent ask/);
    assert.ok(term.includes(`specgate agent ask '${q}' --plan`), term.slice(-300));
    assert.match(term, /plan_empty/);
  } finally {
    await close(s, page);
  }
});

test('REQ-183 SCN-547: in the browser, "@REQ-03" offers REQ-031 and REQ-034 with their titles; choosing REQ-031 puts "@REQ-031" in the request', async () => {
  const s = await withAgent();
  const page = await open(s);
  try {
    await page.click('[data-testid="agent-input"]');
    await page.keyboard.type("Revisa @REQ-03");
    await page.waitForSelector('.agent-mentions [data-mention="REQ-034"]');
    const offered = await page.$$eval(".agent-mentions [data-mention]", (els) =>
      els.map((e) => [e.getAttribute("data-mention"), e.querySelector(".muted")?.textContent]),
    );
    assert.ok(
      offered.some(([id, title]) => id === "REQ-031" && title === "Cancel an order"),
      JSON.stringify(offered),
    );
    assert.ok(
      offered.some(([id, title]) => id === "REQ-034" && title === "Free shipping from an amount"),
      JSON.stringify(offered),
    );
    await page.click('.agent-mentions [data-mention="REQ-031"]');
    assert.equal(await page.inputValue('[data-testid="agent-input"]'), "Revisa @REQ-031 ");
    assert.equal(await page.$(".agent-mentions"), null);
  } finally {
    await close(s, page);
  }
});
