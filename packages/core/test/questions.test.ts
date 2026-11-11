/**
 * draft-questions in the core: the commands Questions runs — `specgate answer`
 * (REQ-092) and `specgate answer --reviewed` for "The spec says it" (REQ-093)
 * — as argument arrays, and what their notices say, in English and Spanish.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  Commands,
  HELP,
  commandLine,
  explain,
  type CommandEvent,
  type ProcessRunner,
} from "../src/index.js";

async function ended(command: Parameters<Commands["run"]>[0], exitCode = 0) {
  const events: CommandEvent[] = [];
  const runs: string[][] = [];
  const runner: ProcessRunner = { run: async (args) => (runs.push([...args]), exitCode) };
  const commands = new Commands(runner);
  commands.onEvent((e) => events.push(e));
  const result = await commands.run(command);
  const end = events.find((e) => e.type === "ended");
  assert.ok(end?.type === "ended" && end.notice);
  return { notice: end.notice, runs, result };
}

test('REQ-092 SCN-273: Q1 answered "50 €" runs `specgate answer Q1 "50 €" --change draft-pedidos`, one value one argument', async () => {
  assert.deepEqual(
    commandLine({ name: "answer", q: "Q1", answer: "50 €", change: "draft-pedidos" }),
    { args: ["answer", "Q1", "50 €", "--change", "draft-pedidos"], write: true },
  );
  const { notice, result } = await ended({
    name: "answer",
    q: "Q1",
    answer: "50 €",
    change: "draft-pedidos",
  });
  // The answer is written; nothing is confirmed yet: "The spec says it" comes next.
  assert.equal(notice.en.next, "specgate answer Q1 --reviewed --change draft-pedidos");
  assert.deepEqual(result.ok && result.written, [
    "docs/specs/changes/draft-pedidos/questions.md",
    "docs/specs/changes/draft-pedidos/assumptions.md",
  ]);
});

test('REQ-093 SCN-275: "The spec says it" on Q1 runs `specgate answer Q1 --reviewed --change draft-pedidos`, a write', async () => {
  assert.deepEqual(commandLine({ name: "answer-reviewed", q: "Q1", change: "draft-pedidos" }), {
    args: ["answer", "Q1", "--reviewed", "--change", "draft-pedidos"],
    write: true,
  });
  const { notice, runs } = await ended({
    name: "answer-reviewed",
    q: "Q1",
    change: "draft-pedidos",
  });
  assert.deepEqual(runs, [["answer", "Q1", "--reviewed", "--change", "draft-pedidos"]]);
  assert.equal(notice.en.tone, "ok");
  assert.match(notice.en.ran, /`specgate answer Q1 --reviewed --change draft-pedidos` marked/);
  assert.match(
    notice.en.wrote,
    /questions\.md`, `docs\/specs\/changes\/draft-pedidos\/assumptions/,
  );
  assert.match(notice.en.wrote, /no longer wait for an answer/);
  assert.equal(notice.en.next, "specgate status");
  assert.match(notice.es.ran, /marcó la respuesta como revisada/);
});

test("REQ-093: a question of the project itself — `--change project`, and the project's questions.md and assumptions.md", async () => {
  const { notice, result } = await ended({ name: "answer-reviewed", q: "Q4", change: "project" });
  assert.deepEqual(result.ok && result.written, [
    "docs/specs/questions.md",
    "docs/specs/assumptions.md",
  ]);
  assert.match(notice.en.ran, /specgate answer Q4 --reviewed --change project/);
});

test("REQ-093: refused by specgate — the notice says how it ended, and nothing is said to be lifted", async () => {
  const { notice, result } = await ended(
    { name: "answer-reviewed", q: "Q1", change: "draft-pedidos" },
    1,
  );
  assert.equal(notice.en.tone, "failed");
  assert.deepEqual(result.ok && result.written, []);
  assert.equal(notice.en.wrote, "No file was written.");
});

test('REQ-093: its "?" in English and Spanish says it changes no requirement\'s text', () => {
  const vars = { q: "Q1", change: "draft-pedidos" };
  assert.equal(
    explain("answer-reviewed", "en", vars).command,
    "specgate answer Q1 --reviewed --change draft-pedidos",
  );
  assert.match(
    explain("answer-reviewed", "en", vars).doesNot,
    /does not change a requirement's text/,
  );
  assert.match(explain("answer-reviewed", "es", vars).doesNot, /No cambia el texto/);
  assert.ok(HELP["answer-reviewed"].es);
});
