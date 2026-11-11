/**
 * draft-questions against a real specgate: the commands Questions runs write
 * what the brief says — the answer to its row, the requirement still blocked
 * (REQ-092); "The spec says it" lifts Needs Clarification (REQ-093).
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { Commands, type ProcessRunner } from "@specgate-studio/core";
import { SpecgateCli, specgateBin } from "../src/index.js";
import { shop } from "./fixture.js";

type Home = { requirements: Array<{ id: string; category: string }> };
type Questions = {
  questions: { open: Array<{ id: string }>; answered?: Array<{ id: string; answer: string }> };
};

test('REQ-092 REQ-093: Q1 answered "50 €" with a real specgate — its row says it, REQ-002 still waits; "The spec says it" lifts it', async () => {
  const dir = shop();
  try {
    const cli = new SpecgateCli({
      program: process.execPath,
      prefix: [specgateBin()],
      projectDir: dir,
    });
    // The port runs the command the studio would: specgate's own exit code.
    const runner: ProcessRunner = { run: async (args) => (await cli.call(args)).exitCode };
    const commands = new Commands(runner);
    const category = async (req: string) =>
      ((await cli.read("home")) as Home).requirements.find((r) => r.id === req)?.category;

    assert.equal(await category("REQ-002"), "WAITING_FOR_ANSWER");

    const answered = await commands.run({
      name: "answer",
      q: "Q1",
      answer: "50 €",
      change: "draft-orders",
    });
    assert.equal(answered.ok && answered.exitCode, 0);
    const row = fs
      .readFileSync(path.join(dir, "docs/specs/changes/draft-orders/questions.md"), "utf8")
      .split(/\r?\n/)
      .find((l) => /^\|\s*Q1\s*\|/.test(l));
    assert.match(row ?? "", /\| 50 € \|/);
    assert.equal(await category("REQ-002"), "WAITING_FOR_ANSWER", "blocked until confirmed");
    const doc = (await cli.read("questions")) as Questions;
    assert.ok(!doc.questions.open.some((q) => q.id === "Q1"));
    // specgate 0.33.2 keeps it in sight until it is confirmed (specgate REQ-482).
    if (doc.questions.answered)
      assert.deepEqual(
        doc.questions.answered.map((q) => [q.id, q.answer]),
        [["Q1", "50 €"]],
      );

    const reviewed = await commands.run({
      name: "answer-reviewed",
      q: "Q1",
      change: "draft-orders",
    });
    assert.equal(reviewed.ok && reviewed.exitCode, 0);
    assert.notEqual(await category("REQ-002"), "WAITING_FOR_ANSWER");
    assert.equal(await category("REQ-003"), "WAITING_FOR_ANSWER", "Q2 still holds REQ-003");
    const after = (await cli.read("questions")) as Questions;
    assert.deepEqual(after.questions.answered ?? [], []);
  } finally {
    fs.rmSync(path.dirname(dir), { recursive: true, force: true });
  }
});
