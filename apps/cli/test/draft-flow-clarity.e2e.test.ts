/**
 * draft-flow-clarity in a real browser, on fakes: "Draft the modules" shows
 * each module as it goes and has the agent fix a draft left with findings
 * (REQ-241); Changes says why a draft cannot be approved and offers the
 * agent's fix (REQ-242), offers each requirement its next step, and shows the
 * action under way on its card (REQ-243).
 */
import test from "node:test";
import assert from "node:assert/strict";
import type { SpecgateAnswer } from "@specgate-studio/core";
import { close, open, studio, untilTerm, type Page } from "./support.js";

const BRIEF = `---
product: Sprich
surfaces: [web]
actors:
  - { name: Customer, surfaces: [web] }
modules: [pedidos, pagos]
---

## Module: pedidos

Rules
- Orders are kept a year.

## Module: pagos

Rules
- An expired card is refused.
`;

const FINDING = {
  severity: "error" as const,
  code: "D6_unlisted_value",
  message: 'SCN-031 states "0", which is not in the brief.',
};

/** Each draft of a module answers when the test says, with the next answer of its list. */
function drafting(answers: Record<string, SpecgateAnswer[]>) {
  const waiting: Array<() => void> = [];
  const next = (module: string) => () =>
    new Promise<SpecgateAnswer>((ok) => {
      waiting.push(() =>
        ok(answers[module]!.length > 1 ? answers[module]!.shift()! : answers[module]![0]!),
      );
    });
  const s = studio({
    files: { "docs/brief.md": BRIEF, "spec.md": "# spec.md\n" },
    specgate: {
      "config list": { data: { config: { agent: "claude -p" } }, findings: [], exitCode: 0 },
      "propose --from-brief": {
        data: {
          draft: {
            brief: "docs/brief.md",
            modules: [
              { module: "pedidos", change: "draft-pedidos", findings: 0, state: "not started" },
              { module: "pagos", change: "draft-pagos", findings: 0, state: "not started" },
            ],
          },
        },
        findings: [],
        exitCode: 0,
      },
      "propose --from-brief pedidos --agent claude -p": next("pedidos"),
      "propose --from-brief pagos --agent claude -p": next("pagos"),
    },
  });
  /** Lets the oldest waiting draft answer, once one waits. */
  const release = async () => {
    for (let i = 0; i < 400 && waiting.length === 0; i++)
      await new Promise((r) => setTimeout(r, 25));
    assert.ok(waiting.length > 0, "a draft waits");
    waiting.shift()!();
  };
  return { s, release };
}

const ready = (module: string): SpecgateAnswer => ({
  data: { draft: { module, change: `draft-${module}`, state: "ready" } },
  findings: [],
  exitCode: 0,
});
const withFinding = (module: string): SpecgateAnswer => ({
  data: { draft: { module, change: `draft-${module}`, state: "drafting" } },
  findings: [FINDING],
  exitCode: 1,
});

const state = (page: Page, module: string) =>
  page.getAttribute(`[data-testid="drafting"] li[data-module="${module}"]`, "data-state");
const untilState = (page: Page, module: string, want: string) =>
  page.waitForSelector(
    `[data-testid="drafting"] li[data-module="${module}"][data-state="${want}"]`,
  );

async function briefView(page: Page) {
  await page.click('.sga[data-view="brief"]');
  await page.waitForSelector('.modules [data-module="pagos"]');
}

test("REQ-241 SCN-1018: in the browser, pedidos fixed on its second pass, then pagos — the panel shows each step and ends 2 of 2", async () => {
  const { s: made, release } = drafting({
    pedidos: [withFinding("pedidos"), ready("pedidos")],
    pagos: [ready("pagos")],
  });
  const s = await made;
  const page = await open(s);
  try {
    await briefView(page);
    await page.click('button[data-action="draft-modules"]');
    await untilState(page, "pedidos", "now");
    assert.equal(await state(page, "pagos"), "todo");
    assert.match(
      (await page.textContent('[data-testid="drafting"] li[data-module="pedidos"]'))!,
      /claude/,
    );
    await release();
    await untilState(page, "pedidos", "fixing");
    assert.match(
      (await page.textContent('[data-testid="drafting"] li[data-module="pedidos"]'))!,
      /pass 1 of 2/,
    );
    await release();
    await untilState(page, "pagos", "now");
    assert.equal(await state(page, "pedidos"), "done");
    await release();
    await untilState(page, "pagos", "done");
    assert.match(
      (await page.textContent('[data-testid="drafting-count"]'))!,
      /^2 of 2 · \d+:\d\d$/,
    );
  } finally {
    await close(s, page);
  }
});

test('REQ-241 SCN-1019: on the desktop, pedidos keeps its finding — drafted and fixed twice, then stopped with 1 finding and "See it in Changes"; pagos never drafted', async () => {
  const { s: made, release } = drafting({
    pedidos: [withFinding("pedidos")],
    pagos: [ready("pagos")],
  });
  const s = await made;
  const page = await open(s);
  try {
    await briefView(page);
    await page.click('button[data-action="draft-modules"]');
    await release();
    await release();
    await release();
    await untilState(page, "pedidos", "stopped");
    assert.match(
      (await page.textContent('[data-testid="drafting"] li[data-module="pedidos"]'))!,
      /1 findings left after 2 passes/,
    );
    assert.equal(await state(page, "pagos"), "todo");
    assert.equal(
      s.calls.filter((c) => c.join(" ") === "propose --from-brief pedidos --agent claude -p")
        .length,
      3,
    );
    assert.ok(!s.calls.some((c) => c.join(" ") === "propose --from-brief pagos --agent claude -p"));
    await page.click('[data-testid="drafting"] [data-action="see-changes"]');
    await page.waitForSelector(
      '.sga[data-view="changes"][aria-current="page"], .sga[data-view="changes"].on',
    );
  } finally {
    await close(s, page);
  }
});

/** sprich in Changes: draft-pedidos waiting for discover with what blocks it; add-coupons approved. */
function changesStudio(o: { blockers?: unknown[]; slowApprove?: boolean } = {}) {
  let approve!: () => void;
  const approved = new Promise<void>((r) => (approve = r));
  const s = studio({
    sections: {
      home: {
        total: 2,
        pending: 2,
        requirements: [
          {
            id: "REQ-030",
            title: "A coupon",
            category: "NEEDS_EVERYTHING",
            needs: "a test and code",
            change: "add-coupons",
          },
          {
            id: "REQ-031",
            title: "A coupon once",
            category: "NEEDS_STATUS_UPDATE",
            needs: "its status",
            change: "add-coupons",
          },
          {
            id: "REQ-032",
            title: "Coupon per customer",
            category: "WAITING_FOR_ANSWER",
            needs: "an answer to Q1",
            change: "add-coupons",
          },
        ],
        nextCommand: "specgate apply REQ-031",
      },
      changes: { changes: [{ id: "draft-pedidos" }, { id: "add-coupons" }] },
    },
    specgate: {
      "config list": { data: { config: { agent: "claude" } }, findings: [], exitCode: 0 },
      "change show draft-pedidos": {
        data: {
          change: {
            id: "draft-pedidos",
            config: { brief: "docs/brief.md" },
            approvals: {
              required: true,
              approved: false,
              layers: [{ layer: "discover", owner: "product", present: true, approved: false }],
            },
            ...(o.blockers ? { blockers: o.blockers } : {}),
          },
        },
        findings: [],
        exitCode: 0,
      },
      "change show add-coupons": {
        data: { change: { id: "add-coupons", config: { approved: "2026-11-21" } } },
        findings: [],
        exitCode: 0,
      },
      "change approve draft-pedidos --layer discover": async () => {
        if (o.slowApprove) await approved;
        return { data: { approved: { change: "draft-pedidos" } }, findings: [], exitCode: 0 };
      },
      "propose --from-brief pedidos --agent claude": async () => ({
        data: { draft: { module: "pedidos", change: "draft-pedidos", state: "ready" } },
        findings: [],
        exitCode: 0,
      }),
    },
  });
  return { s, approve };
}

async function changesView(page: Page, id: string) {
  await page.click('.sga[data-view="changes"]');
  await page.click(`.crow[data-change="${id}"]`);
  await page.waitForSelector(`.detail .card.change[data-change="${id}"]`);
}

const BLOCKERS = [
  {
    code: "D6_unlisted_value",
    message: 'SCN-031 states "0", which is not in the brief.',
    fix: "List it as an assumption.",
    target: "SCN-031",
  },
  {
    code: "approve_question_open",
    message: "Q2 is open: How long is an order kept?",
    fix: "Answer Q2 in questions.md.",
  },
];

test('REQ-242 SCN-1020: in the browser, draft-pedidos with two blockers — "Cannot be approved yet (2)", both messages and fixes, Approve disabled, "Fix with the agent" offered', async () => {
  const { s: made } = changesStudio({ blockers: BLOCKERS });
  const s = await made;
  const page = await open(s);
  try {
    await changesView(page, "draft-pedidos");
    const card = '.detail .card.change[data-change="draft-pedidos"]';
    await page.waitForSelector(`${card} [data-testid="blockers"]`);
    assert.match(
      (await page.textContent(`${card} [data-testid="blockers"] b`))!,
      /Cannot be approved yet \(2\)/,
    );
    assert.deepEqual(
      await page.$$eval(`${card} [data-testid="blockers"] li`, (els) =>
        els.map((e) => [
          e.querySelector('[data-part="message"]')?.textContent,
          e.querySelector('[data-part="fix"]')?.textContent?.trim(),
        ]),
      ),
      [
        ['SCN-031 states "0", which is not in the brief.', "Fix: List it as an assumption."],
        ["Q2 is open: How long is an order kept?", "Fix: Answer Q2 in questions.md."],
      ],
    );
    assert.equal(
      await page.$eval(`${card} [data-action="approve"]`, (b) => (b as HTMLButtonElement).disabled),
      true,
    );
    assert.ok(await page.isVisible(`${card} [data-action="fix"]`));
  } finally {
    await close(s, page);
  }
});

test("REQ-242: with a specgate that does not say blockers, draft-pedidos shows as before — Approve enabled, no blockers", async () => {
  const { s: made } = changesStudio();
  const s = await made;
  const page = await open(s);
  try {
    await changesView(page, "draft-pedidos");
    const card = '.detail .card.change[data-change="draft-pedidos"]';
    await page.waitForSelector(`${card} [data-action="approve"]`);
    assert.equal(await page.$(`${card} [data-testid="blockers"]`), null);
    assert.equal(
      await page.$eval(`${card} [data-action="approve"]`, (b) => (b as HTMLButtonElement).disabled),
      false,
    );
  } finally {
    await close(s, page);
  }
});

test('REQ-242 SCN-1021: on the desktop, "Fix with the agent" — `specgate propose --from-brief pedidos --agent claude` runs, in the terminal', async () => {
  const { s: made } = changesStudio({ blockers: BLOCKERS.slice(0, 1) });
  const s = await made;
  const page = await open(s);
  try {
    await changesView(page, "draft-pedidos");
    await page.click('.detail .card.change[data-change="draft-pedidos"] [data-action="fix"]');
    await untilTerm(page, "specgate", /propose --from-brief pedidos --agent claude/);
    assert.ok(s.calls.some((c) => c.join(" ") === "propose --from-brief pedidos --agent claude"));
  } finally {
    await close(s, page);
  }
});

test('REQ-243 SCN-1022: in the browser, REQ-030 needs a test and code — "Build", no Apply; REQ-031 offers Apply; REQ-032 offers Answer; "Build" opens Build', async () => {
  const { s: made } = changesStudio();
  const s = await made;
  const page = await open(s);
  try {
    await changesView(page, "add-coupons");
    const req = (id: string, action: string) =>
      `.detail .card.change[data-change="add-coupons"] li[data-req="${id}"] [data-action="${action}"]`;
    await page.waitForSelector(req("REQ-030", "build"));
    assert.equal(await page.$(req("REQ-030", "apply")), null, "no Apply without a test");
    assert.ok(await page.$(req("REQ-031", "apply")));
    assert.equal(await page.$(req("REQ-031", "build")), null);
    assert.ok(await page.$(req("REQ-032", "answer")));
    await page.click(req("REQ-030", "build"));
    await page.waitForSelector(
      '.sga[data-view="build"][aria-current="page"], .sga[data-view="build"].on',
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-243 SCN-1023: on the desktop, Approve while specgate is slow — the card shows the approval under way with its seconds until specgate answers", async () => {
  const { s: made, approve } = changesStudio({ slowApprove: true });
  const s = await made;
  const page = await open(s);
  try {
    await changesView(page, "draft-pedidos");
    const card = '.detail .card.change[data-change="draft-pedidos"]';
    await page.click(`${card} [data-action="approve"]`);
    await page.waitForSelector(`${card} [data-testid="running"]`);
    assert.match(
      (await page.textContent(`${card} [data-testid="running"]`))!,
      /Approve discover… \d+ s/,
    );
    await page.waitForFunction(
      (sel) => Number(document.querySelector(sel)?.getAttribute("data-seconds")) >= 1,
      `${card} [data-testid="running"]`,
    );
    approve();
    await page.waitForSelector(`${card} [data-testid="running"]`, { state: "detached" });
  } finally {
    await close(s, page);
  }
});
