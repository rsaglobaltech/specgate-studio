/**
 * draft-editor in a real browser: Monaco only once a file opens (REQ-041), the
 * actions above each requirement (REQ-042), findings underlined (REQ-043), the
 * blocking question answered inline through `specgate answer` (REQ-044), and
 * nothing written but what the person saves (REQ-045).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { MOD, close, open, studio, untilTerm, openFromExplorer, type Page } from "./support.js";

const SPEC_PATH = "docs/specs/changes/draft-pedidos/specs/pedidos/spec.md";
const SPEC = [
  "# Delta — pedidos",
  "",
  "## ADDED Requirements",
  "",
  "### Requirement: REQ-030 — Place an order",
  "",
  "The system SHALL let a customer place an order.",
  "",
  "### Requirement: REQ-031 — Cancel an order",
  "",
  "The system SHALL let a customer cancel an order until it is shipped.",
  "",
  "#### Scenario: SCN-031 — Cancelled before shipping",
  "",
].join("\n");
const QUESTIONS = [
  "# Questions — draft-pedidos",
  "",
  "| #   | Question                              | Blocks  | Options seen                     |",
  "| --- | ------------------------------------- | ------- | -------------------------------- |",
  "| Q2  | Until when can an order be cancelled? | REQ-031 | until it is shipped; within 24 h |",
].join("\n");

const sprich = () =>
  studio({
    files: {
      [SPEC_PATH]: SPEC,
      "docs/specs/changes/draft-pedidos/questions.md": QUESTIONS,
      "docs/brief.md": "# Brief\n",
    },
    findings: [
      {
        severity: "error",
        code: "D6_unlisted_value",
        message: "A value the brief never gave.",
        fix: "Use the brief's value, or ask.",
        file: SPEC_PATH,
        line: 7,
      },
    ],
  });

/** Opens the spec from Explorer and waits for Monaco to show it with its actions. */
async function openSpec(page: Page) {
  await openFromExplorer(page, SPEC_PATH);
  await page.waitForSelector(".monaco-editor .view-lines");
  await page.waitForFunction(
    () => document.querySelectorAll(".codelens-decoration a").length >= 10,
  );
}

const markers = (page: Page) =>
  page.evaluate(() =>
    (window as any).__studio.monaco.editor.getModelMarkers({}).map((m: any) => ({
      code: m.code,
      line: m.startLineNumber,
      from: m.startColumn,
      to: m.endColumn,
      message: m.message,
    })),
  );

test("REQ-041 SCN-121 SCN-122: Home and Questions without the editor's code; it is downloaded when the first file opens", async () => {
  const s = await sprich();
  const page = await open(s);
  const requested: string[] = [];
  page.on("request", (r) => requested.push(r.url()));
  try {
    await page.click('.sga[data-view="questions"]');
    await page.waitForSelector('.content h1:has-text("Questions")');
    const editorCode = (u: string) => /EditorPane|editor\.worker|codicon/.test(u);
    assert.deepEqual(requested.filter(editorCode), [], "nothing of the editor before a file opens");
    assert.equal(await page.evaluate(() => (window as any).__studio.monaco), undefined);
    await openSpec(page);
    assert.ok(
      requested.some((u) => /EditorPane-.*\.js$/.test(u)),
      "the editor's code came with the first file",
    );
    const shown = ((await page.textContent(".monaco-editor .view-lines")) ?? "").replace(
      /\u00a0/g,
      " ",
    );
    assert.match(shown, /Cancel an order/);
  } finally {
    await close(s, page);
  }
});

test('REQ-042 SCN-123: Build, Check, Trace, Ask for a change and "?" above REQ-031, and above every other requirement', async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await openSpec(page);
    const lenses = await page.$$eval(".codelens-decoration", (rows) =>
      rows.map((r) => [...r.querySelectorAll("a")].map((a) => a.textContent)),
    );
    assert.deepEqual(lenses, [
      ["Build", "Check", "Trace", "Ask for a change", "?"],
      ["Build", "Check", "Trace", "Ask for a change", "?"],
    ]);
    // Each action names the command it runs.
    const titles = await page.$$eval(".codelens-decoration", (rows) =>
      [...rows[1]!.querySelectorAll("a")].map((a) => a.getAttribute("title")),
    );
    assert.equal(titles[0], "specgate harness run --req REQ-031");
    assert.equal(titles[1], "specgate check");
  } finally {
    await close(s, page);
  }
});

test("REQ-042 SCN-124: Check above REQ-031 runs `specgate check`, the terminal shows it, the notice names it and how it ended", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await openSpec(page);
    await page.click('.codelens-decoration >> nth=1 >> a:has-text("Check")');
    await page.waitForSelector('.notice[data-tone="ok"]');
    assert.deepEqual(s.runs, [["check"]]);
    // The terminal shows the command, named by the button that ran it (draft-terminal REQ-053).
    await untilTerm(page, "specgate", /▶ "Check" · specgate check[\s\S]*exit 0/);
    assert.match(
      (await page.textContent('.notice [data-part="ran"]')) ?? "",
      /specgate check.*passed/,
    );
  } finally {
    await close(s, page);
  }
});

test('REQ-043 SCN-125: REQ-031\'s "until it is shipped" underlined — Q2 is open, with the fix that answers it', async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await openSpec(page);
    await page.waitForFunction(
      () => (window as any).__studio.monaco.editor.getModelMarkers({}).length >= 2,
    );
    const q = (await markers(page)).find((m: any) => m.code === "question_open");
    assert.ok(q);
    assert.equal(q.line, 11);
    assert.equal(SPEC.split("\n")[10]!.slice(q.from - 1, q.to - 1), "until it is shipped");
    assert.match(
      q.message,
      /Q2 is open: Until when can an order be cancelled\?\nFix: specgate answer Q2 "…" --change draft-pedidos/,
    );
    assert.ok(await page.$(".squiggly-warning"), "drawn as an underline");
  } finally {
    await close(s, page);
  }
});

test("REQ-043 SCN-126: the gate's finding D6_unlisted_value underlined at its line, with its message and fix", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await openSpec(page);
    await page.waitForFunction(
      () => (window as any).__studio.monaco.editor.getModelMarkers({}).length >= 2,
    );
    const d6 = (await markers(page)).find((m: any) => m.code === "D6_unlisted_value");
    assert.ok(d6);
    assert.equal(d6.line, 7);
    assert.equal(d6.message, "A value the brief never gave.\nFix: Use the brief's value, or ask.");
    assert.ok(await page.$(".squiggly-error"));
  } finally {
    await close(s, page);
  }
});

test('REQ-044 SCN-127 SCN-128: Q2 under REQ-031 with its options; "until it is shipped" chosen and confirmed runs `specgate answer`, and Q2 goes', async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await openSpec(page);
    const zone = '.qzone[data-question="Q2"][data-req="REQ-031"]';
    await page.waitForSelector(zone);
    assert.match((await page.textContent(zone)) ?? "", /Q2 Until when can an order be cancelled\?/);
    assert.deepEqual(
      await page.$$eval(`${zone} [data-option]`, (els) =>
        els.map((e) => e.getAttribute("data-option")),
      ),
      ["until it is shipped", "within 24 h"],
    );
    await page.click(`${zone} [data-option="until it is shipped"]`);
    assert.deepEqual(s.runs, [], "choosing is not answering");
    await page.click(`${zone} .btn.pri`);
    await page.waitForSelector('.notice[data-tone="ok"]');
    assert.deepEqual(s.runs, [
      ["answer", "Q2", "until it is shipped", "--change", "draft-pedidos"],
    ]);
    assert.match((await page.textContent('.notice [data-part="ran"]')) ?? "", /specgate answer Q2/);
    assert.match(
      (await page.textContent('.notice [data-part="wrote"]')) ?? "",
      /docs\/specs\/changes\/draft-pedidos\/questions\.md/,
    );
    await page.waitForFunction((sel) => !document.querySelector(sel), zone);
    assert.deepEqual(s.writes, [], "the studio edited no file itself");
  } finally {
    await close(s, page);
  }
});

test("REQ-045 SCN-129: an edit saved — that one file written, no specgate command", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await openSpec(page);
    await page.click(".monaco-editor .view-line >> nth=0");
    await page.keyboard.press("End");
    await page.keyboard.type(" (edited)");
    await page.waitForSelector(".tab .dirty");
    await page.keyboard.press(`${MOD}+S`);
    await page.waitForFunction(() => !document.querySelector(".tab .dirty"));
    assert.deepEqual(s.writes, [SPEC_PATH]);
    assert.match(s.disk[SPEC_PATH]!.split("\n")[0]!, /^# Delta — pedidos \(edited\)$/);
    assert.deepEqual(s.runs, []);
    assert.match(
      (await page.textContent(".notice")) ?? "",
      /No other file was written and no command ran/,
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-045 SCN-130: an unsaved file's tab closed — the studio asks; \"Don't save\" leaves the file on disk unchanged", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await openSpec(page);
    await page.click(".monaco-editor .view-line >> nth=0");
    await page.keyboard.type("XYZ ");
    await page.waitForSelector(".tab .dirty");
    await page.keyboard.press(`${MOD}+W`);
    await page.waitForSelector('[role="dialog"][aria-label="Save the changes to spec.md?"]');
    await page.click('button:has-text("Don\'t save")');
    await page.waitForFunction(() => document.querySelectorAll(".tab").length === 0);
    assert.deepEqual(s.writes, []);
    assert.equal(s.disk[SPEC_PATH], SPEC);
    // Reopened, it shows the file as it is on disk.
    await openSpec(page);
    assert.doesNotMatch((await page.textContent(".monaco-editor .view-lines")) ?? "", /XYZ/);
  } finally {
    await close(s, page);
  }
});

test("REQ-064 SCN-187 SCN-188: Ask for a change above REQ-031 — the request goes through `specgate change note`; the notice names review.md, the draft shown is unchanged", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await openSpec(page);
    await page.click('.codelens-decoration >> nth=1 >> a:has-text("Ask for a change")');
    await page.fill("textarea.ask", "Orders can be cancelled until they are shipped");
    await page.click('button:has-text("Send")');
    await page.waitForSelector('.notice[data-tone="ok"]');
    assert.deepEqual(s.runs, [
      [
        "change",
        "note",
        "draft-pedidos",
        "Orders can be cancelled until they are shipped",
        "--req",
        "REQ-031",
      ],
    ]);
    assert.match(
      (await page.textContent('.notice [data-part="wrote"]')) ?? "",
      /review\.md.*requirements are unchanged/,
    );
    assert.equal(
      await page.textContent('.notice [data-part="next"]'),
      "Next: specgate propose --from-brief pedidos",
    );
    // The draft shown is still the one before the request (SCN-188).
    assert.equal(
      await page.evaluate(() => (window as any).__studio.monaco.editor.getModels()[0].getValue()),
      SPEC,
    );
    assert.deepEqual(s.writes, []);
  } finally {
    await close(s, page);
  }
});

test('REQ-061 SCN-182, REQ-062 SCN-183 SCN-184: the "?" above REQ-031 — Build, Check and Ask for a change explained; nothing runs', async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await openSpec(page);
    await page.click('.codelens-decoration >> nth=1 >> a:has-text("?")');
    await page.waitForSelector('.help section[data-action="ask-change"] [data-part="next"]');
    const part = (action: string, p: string) =>
      page.textContent(`.help section[data-action="${action}"] [data-part="${p}"] dd`);
    assert.equal(await part("build", "command"), "specgate harness run --req REQ-031");
    assert.match((await part("build", "doesNot")) ?? "", /does not push/);
    assert.match((await part("build", "next")) ?? "", /gate on the branch/);
    assert.match(
      (await part("ask-change", "files")) ?? "",
      /docs\/specs\/changes\/draft-pedidos\/review\.md/,
    );
    assert.match((await part("ask-change", "doesNot")) ?? "", /only when it is drafted again/);
    assert.match((await part("ask-change", "next")) ?? "", /specgate propose --from-brief pedidos/);
    assert.deepEqual(s.runs, [], "explaining runs nothing");
  } finally {
    await close(s, page);
  }
});
