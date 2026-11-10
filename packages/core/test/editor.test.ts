/**
 * draft-editor — what the editor shows over a specification file, worked out
 * in the core so the UI only paints it: the actions above each requirement
 * (REQ-042), the underlined findings (REQ-043), the blocking questions with
 * their options (REQ-044); the commands it runs for the person (REQ-044, help).
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  Commands,
  annotate,
  changeOf,
  commandLine,
  questionOptions,
  requirementHeadings,
  type CommandEvent,
  type ProcessRunner,
} from "../src/index.js";

const PATH = "docs/specs/changes/draft-pedidos/specs/pedidos/spec.md";
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

const QUESTIONS_MD = [
  "# Questions — draft-pedidos",
  "",
  "| #   | Question                               | Blocks  | Options seen                              |",
  "| --- | -------------------------------------- | ------- | ----------------------------------------- |",
  "| Q1  | From what amount is shipping free?     | REQ-030 | 50 €; 100 €                               |",
  "| Q2  | Until when can an order be cancelled?  | REQ-031 | until it is shipped; within 24 h          |",
].join("\n");

const Q2 = {
  id: "Q2",
  change: "draft-pedidos",
  text: "Until when can an order be cancelled?",
  blocks: ["REQ-031"],
};

test("REQ-042 SCN-123: every `### Requirement:` heading of the file, with its line", () => {
  assert.deepEqual(requirementHeadings(SPEC), [
    { req: "REQ-030", line: 5 },
    { req: "REQ-031", line: 9 },
  ]);
  assert.deepEqual(requirementHeadings("# nothing\r\n### Requirement: REQ-007 — x\r\n"), [
    { req: "REQ-007", line: 2 },
  ]);
});

test("REQ-044 SCN-127: Q2's options, as its questions.md lists them", () => {
  assert.deepEqual(questionOptions(QUESTIONS_MD, "Q2"), ["until it is shipped", "within 24 h"]);
  assert.deepEqual(questionOptions(QUESTIONS_MD, "Q9"), []);
  assert.deepEqual(questionOptions(QUESTIONS_MD.replace(/\n/g, "\r\n"), "Q1"), ["50 €", "100 €"]);
});

test('REQ-043 SCN-125: REQ-031\'s "until it is shipped" underlined — Q2 is open, and the fix answers it', () => {
  const a = annotate({
    path: PATH,
    text: SPEC,
    findings: [],
    questions: [{ ...Q2, options: ["until it is shipped", "within 24 h"] }],
  });
  const mark = a.marks.find((m) => m.code === "question_open");
  assert.ok(mark, JSON.stringify(a));
  assert.equal(mark.line, 11);
  assert.equal(
    SPEC.split("\n")[10]!.slice(mark.startColumn - 1, mark.endColumn - 1),
    "until it is shipped",
  );
  assert.match(mark.message, /Q2 is open: Until when can an order be cancelled\?/);
  assert.equal(mark.fix, 'specgate answer Q2 "…" --change draft-pedidos');
});

test("REQ-043: a blocking question whose options are not in the text underlines the requirement's heading", () => {
  const a = annotate({
    path: PATH,
    text: SPEC,
    findings: [],
    questions: [{ ...Q2, options: ["never"] }],
  });
  const mark = a.marks.find((m) => m.code === "question_open")!;
  assert.equal(mark.line, 9);
  assert.equal(mark.startColumn, 1);
});

test("REQ-043 SCN-126: a gate finding at its file and line — the line underlined with its code, message and fix; other files' findings left out", () => {
  const a = annotate({
    path: PATH,
    text: SPEC,
    questions: [],
    findings: [
      {
        severity: "error",
        code: "D6_unlisted_value",
        message: "24 h is not in the brief.",
        fix: "Use the brief's value, or ask.",
        file: PATH,
        line: 11,
      },
      { severity: "error", code: "other_file", message: "x", file: "spec.md", line: 3 },
      { severity: "error", code: "no_line", message: "y" },
    ],
  });
  assert.deepEqual(
    a.marks.map((m) => [m.code, m.line, m.startColumn, m.endColumn, m.severity, m.fix]),
    [
      [
        "D6_unlisted_value",
        11,
        1,
        SPEC.split("\n")[10]!.length + 1,
        "error",
        "Use the brief's value, or ask.",
      ],
    ],
  );
});

test("REQ-044 SCN-127: Q2 shows under REQ-031 with its text and options; Q1 blocks a requirement of the file too", () => {
  const a = annotate({
    path: PATH,
    text: SPEC,
    findings: [],
    questions: [
      { ...Q2, options: ["until it is shipped", "within 24 h"] },
      {
        id: "Q1",
        change: "draft-pedidos",
        text: "From what amount is shipping free?",
        blocks: ["REQ-030"],
        options: ["50 €"],
      },
      { id: "Q7", change: "other", text: "Not here", blocks: ["REQ-999"], options: [] },
    ],
  });
  assert.deepEqual(
    a.questions.map((q) => [q.id, q.req, q.afterLine, q.options]),
    [
      ["Q1", "REQ-030", 5, ["50 €"]],
      ["Q2", "REQ-031", 9, ["until it is shipped", "within 24 h"]],
    ],
  );
});

test('REQ-044 SCN-128: answering runs `specgate answer Q2 "until it is shipped" --change draft-pedidos` as one argument array, and its notice names the files it wrote', async () => {
  assert.deepEqual(
    commandLine({
      name: "answer",
      q: "Q2",
      answer: "until it is shipped",
      change: "draft-pedidos",
    }),
    {
      args: ["answer", "Q2", "until it is shipped", "--change", "draft-pedidos"],
      write: true,
    },
  );
  const events: CommandEvent[] = [];
  const runner: ProcessRunner = { run: async () => 0 };
  const commands = new Commands(runner);
  commands.onEvent((e) => events.push(e));
  await commands.run({
    name: "answer",
    q: "Q2",
    answer: "until it is shipped",
    change: "draft-pedidos",
  });
  const ended = events.find((e) => e.type === "ended");
  assert.ok(ended?.type === "ended" && ended.notice);
  assert.match(ended.notice.en.ran, /specgate answer Q2 "<answer>" --change draft-pedidos/);
  assert.match(ended.notice.en.wrote, /docs\/specs\/changes\/draft-pedidos\/questions\.md/);
  assert.equal(ended.notice.en.next, "specgate answer Q2 --reviewed --change draft-pedidos");
});

test("REQ-064: Ask for a change runs `specgate change note`; its notice names review.md, says the draft is unchanged, and drafting again comes next", async () => {
  assert.deepEqual(
    commandLine({
      name: "change-note",
      change: "draft-pedidos",
      text: "Orders can be cancelled until they are shipped",
      req: "REQ-031",
    }),
    {
      args: [
        "change",
        "note",
        "draft-pedidos",
        "Orders can be cancelled until they are shipped",
        "--req",
        "REQ-031",
      ],
      write: true,
    },
  );
  const events: CommandEvent[] = [];
  const commands = new Commands({ run: async () => 0 });
  commands.onEvent((e) => events.push(e));
  await commands.run({
    name: "change-note",
    change: "draft-pedidos",
    text: "Orders can be cancelled until they are shipped",
  });
  const ended = events.find((e) => e.type === "ended");
  assert.ok(ended?.type === "ended" && ended.notice);
  assert.match(ended.notice.en.wrote, /docs\/specs\/changes\/draft-pedidos\/review\.md/);
  assert.match(ended.notice.en.wrote, /requirements are unchanged/);
  assert.equal(ended.notice.en.next, "specgate propose --from-brief pedidos");
  assert.match(ended.notice.es.wrote, /requisitos del borrador no cambian/);
});

test("REQ-044: a file's change — the one under docs/specs/changes, none for an archived or capability spec", () => {
  assert.equal(changeOf(PATH), "draft-pedidos");
  assert.equal(changeOf("docs/specs/changes/archive/2026-11-09-x/proposal.md"), null);
  assert.equal(changeOf("docs/specs/capabilities/orders/spec.md"), null);
  assert.equal(
    annotate({ path: PATH, text: SPEC, findings: [], questions: [] }).change,
    "draft-pedidos",
  );
});

test("REQ-042: the annotations carry the headings, where the editor puts the actions", () => {
  assert.deepEqual(
    annotate({ path: PATH, text: SPEC, findings: [], questions: [] }).headings,
    requirementHeadings(SPEC),
  );
});

test("REQ-044 SCN-128: a command that passed says which files it wrote, so the sections they feed are read again", async () => {
  const commands = new Commands({ run: async () => 0 });
  const ok = await commands.run({
    name: "answer",
    q: "Q2",
    answer: "until it is shipped",
    change: "draft-pedidos",
  });
  assert.deepEqual(ok.ok && ok.written, [
    "docs/specs/changes/draft-pedidos/questions.md",
    "docs/specs/changes/draft-pedidos/assumptions.md",
  ]);
  const failed = await new Commands({ run: async () => 1 }).run({
    name: "answer",
    q: "Q2",
    answer: "x",
    change: "draft-pedidos",
  });
  assert.deepEqual(
    failed.ok && failed.written,
    [],
    "a failed command wrote nothing the studio counts on",
  );
});
