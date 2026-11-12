/**
 * draft-brief in a real browser, on fakes: saving `docs/brief.md` runs the
 * brief's checks and Problems lists what they found (REQ-072); "Draft the
 * modules" drafts each module not drafted yet with the project's agent, one
 * at a time (REQ-073). The desktop app runs the same UI bundle (A12).
 */
import test from "node:test";
import assert from "node:assert/strict";
import type { Finding, SpecgateAnswer } from "@specgate-studio/core";
import {
  MOD,
  close,
  open,
  showPanel,
  studio,
  untilTerm,
  type Page,
  openFromExplorer,
} from "./support.js";

/** sprich's brief (A1): `pedidos` and `pagos`, and the notes of the call outside both. */
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

Examples
- The one where Ana orders two books.

## Module: pagos

Rules
- When the card is expired, the payment is refused.

Examples
- The one where Ana pays with an expired card.

## Notes from the call with the client

They want it before summer.
`;

/** The fake check: specgate's B6 at the line of a rule that promises "some amount" (A4). */
function check(_: unknown, disk: Record<string, string>): SpecgateAnswer {
  const lines = (disk["docs/brief.md"] ?? "").split("\n");
  const at = lines.findIndex((l) => l.includes("some amount"));
  const findings: Finding[] =
    at < 0
      ? []
      : [
          {
            severity: "warning",
            code: "B6_unmeasured",
            message: `"${lines[at]!.slice(2)}" promises a quantity and states no number.`,
            target: "pedidos",
            fix: 'Give the number and its unit: "within 2 seconds", "for 500 students at once".',
            line: at + 1,
            file: "docs/brief.md",
          },
        ];
  return {
    data: { draft: { brief: "docs/brief.md", ready: true, errors: 0, warnings: findings.length } },
    findings,
    exitCode: 0,
  };
}

function sprich() {
  return studio({
    files: { "docs/brief.md": BRIEF, "spec.md": "# spec.md\n" },
    specgate: { "propose --from-brief --check --brief docs/brief.md": check },
  });
}

/** Opens docs/brief.md in the editor, sets its text as the Developer would type it, and saves. */
async function saveBrief(page: Page, text: string) {
  if (!(await page.$('.tab[title="docs/brief.md"]'))) {
    await openFromExplorer(page, "docs/brief.md");
  } else await page.click('.tab[title="docs/brief.md"]');
  await page.waitForSelector(".monaco-editor .view-lines");
  await page.evaluate((t) => {
    const model = (window as any).__studio.monaco.editor
      .getModels()
      .find((m: any) => m.uri.path.endsWith("docs/brief.md"));
    model.setValue(t);
  }, text);
  await page.click(".monaco-editor .view-line >> nth=0");
  await page.keyboard.press(`${MOD}+S`);
}

test('REQ-072 SCN-213: on the desktop, "Shipping is free above some amount" saved in pedidos — Problems lists B6_unmeasured at its line, with a fix asking for the number', async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await showPanel(page);
    await page.click('.ptab:has-text("Problems")');
    await page.waitForSelector('[data-panel="problems"] [data-empty]');
    const vague = BRIEF.replace("Orders are kept a year.", "Shipping is free above some amount.");
    await saveBrief(page, vague);
    const row = await page.waitForSelector('[data-panel="problems"] [data-code="B6_unmeasured"]');
    const line = vague.split("\n").indexOf("- Shipping is free above some amount.") + 1;
    assert.equal(await row.getAttribute("data-line"), String(line));
    const text = (await row.textContent()) ?? "";
    assert.match(text, /promises a quantity and states no number/);
    assert.match(text, /Give the number and its unit/);
    assert.match(text, new RegExp(`docs/brief\\.md:${line}`));
    assert.equal(s.disk["docs/brief.md"], vague, "the file is saved as written");
    // The brief's own reads (Home reads the changes and the agent's cost beside it).
    assert.deepEqual(
      s.calls.filter((c) => c[0] === "propose"),
      [["propose", "--from-brief", "--check", "--brief", "docs/brief.md"]],
    );
    // And underlined in the editor at that line (draft-editor REQ-043).
    await page.waitForFunction(
      (l) =>
        (window as any).__studio.monaco.editor
          .getModelMarkers({})
          .some(
            (m: any) =>
              m.startLineNumber === l && /B6_unmeasured/.test(String(m.code ?? m.message)),
          ),
      line,
    );
  } finally {
    await close(s, page);
  }
});

test('REQ-072 SCN-214: in the browser, the rule rewritten as "Shipping is free above 50 EUR" and saved — Problems no longer lists it', async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await showPanel(page);
    await page.click('.ptab:has-text("Problems")');
    await saveBrief(
      page,
      BRIEF.replace("Orders are kept a year.", "Shipping is free above some amount."),
    );
    await page.waitForSelector('[data-panel="problems"] [data-code="B6_unmeasured"]');
    await saveBrief(
      page,
      BRIEF.replace("Orders are kept a year.", "Shipping is free above 50 EUR."),
    );
    await page.waitForSelector('[data-panel="problems"] [data-empty]');
    assert.equal(await page.$('[data-panel="problems"] [data-code="B6_unmeasured"]'), null);
    assert.equal(s.calls.filter((c) => c[0] === "propose").length, 2, "one check per save");
  } finally {
    await close(s, page);
  }
});

/** A draft that answers when the test says: `release[module]()`. */
function drafts(agent: string | null) {
  const release: Record<string, () => void> = {};
  const answer = (module: string) => () =>
    new Promise<SpecgateAnswer>((ok) => {
      release[module] = () =>
        ok({
          data: { draft: { module, change: `draft-${module}`, state: "ready" } },
          findings: [],
          exitCode: 0,
        });
    });
  const s = studio({
    files: { "docs/brief.md": BRIEF, "spec.md": "# spec.md\n" },
    specgate: {
      "config list": { data: { config: agent ? { agent } : {} }, findings: [], exitCode: 0 },
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
      "propose --from-brief pedidos --agent claude -p": answer("pedidos"),
      "propose --from-brief pagos --agent claude -p": answer("pagos"),
    },
  });
  return { s, release };
}

/** Opens the Brief view and waits for its modules. */
async function briefView(page: Page) {
  await page.click('.sga[data-view="brief"]');
  await page.waitForSelector('[data-module="pagos"]');
}

const drafting = (calls: string[][], module: string) =>
  calls.filter((c) => c.join(" ") === `propose --from-brief ${module} --agent claude -p`).length;

async function until(check: () => boolean, what: string) {
  for (let i = 0; i < 400 && !check(); i++) await new Promise((ok) => setTimeout(ok, 25));
  assert.ok(check(), what);
}

test('REQ-073 SCN-215: on the desktop, "Draft the modules" — pedidos with the agent, named by the button; pagos only after it ended', async () => {
  const { s, release } = drafts("claude -p");
  const studio = await s;
  const page = await open(studio);
  try {
    await briefView(page);
    assert.equal(
      await page.textContent('[data-module="pedidos"] [data-part="state"]'),
      "not started",
    );
    await page.click('button[data-action="draft-modules"]');
    await untilTerm(
      page,
      "specgate",
      /▶ "Draft the modules" · specgate propose --from-brief pedidos --agent 'claude -p'/,
    );
    await until(() => !!release.pedidos, "pedidos is drafting");
    assert.equal(drafting(studio.calls, "pagos"), 0, "pagos waits for pedidos");
    release.pedidos!();
    await until(() => !!release.pagos, "pagos starts once pedidos ended");
    const text = await untilTerm(
      page,
      "specgate",
      /▶ "Draft the modules" · specgate propose --from-brief pagos --agent 'claude -p'/,
    );
    assert.ok(
      text.indexOf("pedidos --agent") < text.indexOf("exit 0") &&
        text.indexOf("exit 0") < text.indexOf("pagos --agent"),
      "pagos started after pedidos ended",
    );
    release.pagos!();
    await page.waitForSelector('.notice[data-tone="ok"] >> text=had the agent draft pagos');
  } finally {
    await close(studio, page);
  }
});

test('REQ-073 SCN-216: in the browser, "Draft the modules" pressed again while pedidos drafts — refused with write_busy naming it; no second draft', async () => {
  const { s, release } = drafts("claude -p");
  const studio = await s;
  const page = await open(studio);
  try {
    await briefView(page);
    await page.click('button[data-action="draft-modules"]');
    await until(() => !!release.pedidos, "pedidos is drafting");
    await page.click('button[data-action="draft-modules"]');
    const refused = await page.waitForSelector('.notice[data-tone="refused"]');
    const text = (await refused.textContent()) ?? "";
    assert.match(text, /write_busy/);
    assert.match(text, /specgate propose --from-brief pedidos/);
    assert.equal(drafting(studio.calls, "pedidos"), 1, "no second draft started");
    release.pedidos!();
    await until(() => !!release.pagos, "the first press goes on with pagos");
    release.pagos!();
  } finally {
    await close(studio, page);
  }
});

test('REQ-073 SCN-217: on the desktop with no agent set, "Draft the modules" — nothing runs; the notice names `specgate agents init --tool claude`', async () => {
  const { s } = drafts(null);
  const studio = await s;
  const page = await open(studio);
  try {
    await briefView(page);
    await page.click('button[data-action="draft-modules"]');
    const refused = await page.waitForSelector('.notice[data-tone="refused"]');
    const text = (await refused.textContent()) ?? "";
    assert.match(text, /no agent is set/);
    assert.equal(
      await page.textContent('.notice [data-part="next"] .mono'),
      "specgate agents init --tool claude",
    );
    assert.ok(
      studio.calls.every((c) => !(c[0] === "propose" && c.includes("--agent"))),
      "no draft ran",
    );
    assert.deepEqual(studio.runs, []);
  } finally {
    await close(studio, page);
  }
});
