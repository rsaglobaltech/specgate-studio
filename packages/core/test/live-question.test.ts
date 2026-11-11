/**
 * draft-build-live in the core: the agent's question is answered inside Live
 * (REQ-104) — its text from the harness's events, its id and answer from
 * `specgate questions --json` once specgate recorded it; the answer goes
 * through `specgate answer`.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  InMemoryHarnessEvents,
  commandLine,
  liveQuestions,
  sectionsFedBy,
  type LiveRequirement,
  type LiveView,
} from "../src/index.js";
import { SPRICH_STATUS, sprichBuilds } from "./sprich-build.js";

const ASKED = "Round to the cent or to the nearest 5 cents?";
const asking: LiveRequirement = {
  req: "REQ-030",
  attempt: 1,
  state: "question",
  steps: [],
  question: ASKED,
  usage: null,
};
const Q3 = {
  id: "Q3",
  change: "draft-pedidos",
  text: ASKED,
  blocks: ["REQ-030"],
  options: ["to the cent", "to the nearest 5 cents"],
  asked: "build",
};

test("REQ-104 SCN-307: the agent's question, matched to the row specgate recorded — its id, change and options", () => {
  assert.deepEqual(liveQuestions([asking], { questions: { open: [Q3], answered: [] } }), [
    {
      req: "REQ-030",
      text: ASKED,
      id: "Q3",
      change: "draft-pedidos",
      options: ["to the cent", "to the nearest 5 cents"],
      answer: null,
    },
  ]);
});

test("REQ-104: before specgate recorded it, the question has no id yet: nothing to answer through specgate", () => {
  const [q] = liveQuestions([asking], { questions: { open: [], answered: [] } });
  assert.deepEqual([q!.id, q!.answer], [null, null]);
});

test("REQ-104 SCN-308: once answered, it is no longer open: its answer, recorded, waits for review", () => {
  const [q] = liveQuestions([asking], {
    questions: { open: [], answered: [{ ...Q3, answer: "to the cent" }] },
  });
  assert.deepEqual([q!.id, q!.answer], ["Q3", "to the cent"]);
});

test("REQ-104: specgate may word it its own way: the agent's question about that requirement still matches", () => {
  const [q] = liveQuestions([asking], {
    questions: { open: [{ ...Q3, text: "Rounding: cent or 5 cents?" }], answered: [] },
  });
  assert.equal(q!.id, "Q3");
});

test('REQ-104: the answer is `specgate answer Q3 "to the cent" --change draft-pedidos`', () => {
  assert.deepEqual(
    commandLine({ name: "answer", q: "Q3", answer: "to the cent", change: "draft-pedidos" })?.args,
    ["answer", "Q3", "to the cent", "--change", "draft-pedidos"],
  );
});

test("REQ-104 SCN-307: Live carries the question of a requirement of the run, and is told again once it is answered", async () => {
  const events = new InMemoryHarnessEvents();
  let section: unknown = { questions: { open: [Q3], answered: [] } };
  const views: LiveView[] = [];
  const s = sprichBuilds([], "claude", {
    events,
    onLive: (v) => views.push(v),
    pollMs: 5,
    // The sections as ProjectState keeps them: questions read again once answered.
    sections: {
      section: async (x) =>
        x === "questions" ? section : x === "home" ? SPRICH_STATUS : { changes: [] },
    },
  });
  await s.builds.start("REQ-030");
  events.append("REQ-030", { attempt: 1, type: "attempt", state: "start" });
  events.append("REQ-030", { attempt: 1, type: "question", text: ASKED });
  events.append("REQ-030", { attempt: 1, type: "attempt", state: "end", result: "question" });
  s.harness.finish(1, { results: [{ requirement: "REQ-030", result: "question" }] });
  await s.builds.idle();
  let live = await s.builds.live();
  assert.deepEqual(
    live.questions.map((q) => [q.req, q.id, q.answer]),
    [["REQ-030", "Q3", null]],
  );
  assert.equal(live.requirements[0]!.state, "question");

  section = { questions: { open: [], answered: [{ ...Q3, answer: "to the cent" }] } };
  await s.builds.refresh();
  live = views.at(-1)!;
  assert.deepEqual(
    live.questions.map((q) => [q.id, q.answer]),
    [["Q3", "to the cent"]],
  );
  await s.builds.close();
});

test("REQ-104: the project's questions.md feeds Questions — where specgate records what the agent asks about a requirement of spec.md", () => {
  assert.deepEqual(sectionsFedBy("docs/specs/questions.md"), ["questions", "matrix"]);
  assert.deepEqual(sectionsFedBy("docs\\specs\\questions.md"), ["questions", "matrix"]);
});
