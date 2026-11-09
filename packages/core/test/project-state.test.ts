/**
 * draft-core-host — the project's state in the core host (REQ-002 …).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { ProjectState, SECTIONS, type Section, type SectionReader } from "../src/index.js";

/** A specgate that answers each section after `ms`, and counts what it was asked. */
function slowSpecgate(ms: number) {
  const reads: Section[] = [];
  const reader: SectionReader = {
    async read(section) {
      const read = reads.push(section);
      await new Promise((ok) => setTimeout(ok, ms));
      return { section, read };
    },
  };
  return { reader, reads };
}

const since = (start: number) => performance.now() - start;

// ── REQ-002: the project's state kept in memory after the first read ──────

test("REQ-002 SCN-003: after a slow first read, Home comes back from memory in 20 ms with no specgate read", async () => {
  const specgate = slowSpecgate(60);
  const state = new ProjectState(specgate.reader);
  await state.open();
  assert.deepEqual([...specgate.reads].sort(), [...SECTIONS].sort(), "every section read once");

  const start = performance.now();
  const home = await state.section("home");
  assert.ok(since(start) < 20, `Home took ${since(start).toFixed(1)} ms`);
  assert.deepEqual(home, { section: "home", read: specgate.reads.indexOf("home") + 1 });
  assert.equal(specgate.reads.length, SECTIONS.length, "no specgate read after the first");
});

test("REQ-002 SCN-004: asking again — a browser reload — starts no specgate read", async () => {
  const specgate = slowSpecgate(5);
  const state = new ProjectState(specgate.reader);
  await state.open();
  for (const section of SECTIONS) await state.section(section);
  for (const section of SECTIONS) await state.section(section);
  assert.equal(specgate.reads.length, SECTIONS.length);
});

test("REQ-002: requests made while the first read runs share it", async () => {
  const specgate = slowSpecgate(20);
  const state = new ProjectState(specgate.reader);
  const [a, b] = await Promise.all([state.section("changes"), state.section("changes")]);
  assert.deepEqual(a, b);
  assert.equal(specgate.reads.filter((s) => s === "changes").length, 1);
});

// ── REQ-003: a changed file refreshes only what it feeds ─────────────────

async function opened(ms = 1) {
  const specgate = slowSpecgate(ms);
  const state = new ProjectState(specgate.reader);
  await state.open();
  specgate.reads.length = 0;
  const told: Section[][] = [];
  state.onChange((sections) => told.push(sections));
  return { state, reads: specgate.reads, told };
}

test("REQ-003 SCN-005: questions.md saved — only Questions and the matrix are read again, and the UI is told so", async () => {
  const { state, reads, told } = await opened();
  const changed = await state.fileChanged("docs/specs/changes/draft-pedidos/questions.md");
  assert.deepEqual(changed, ["questions", "matrix"]);
  assert.deepEqual([...reads].sort(), ["matrix", "questions"]);
  assert.deepEqual(told, [["questions", "matrix"]]);
  // Changes, Home and Report were not read again.
  for (const untouched of ["changes", "home", "report"] as const)
    assert.ok(!reads.includes(untouched));
});

test("REQ-003 SCN-006: a feature file saved — only the matrix is read again", async () => {
  const { state, reads, told } = await opened();
  assert.deepEqual(await state.fileChanged("features/auth/REQ-010.feature"), ["matrix"]);
  assert.deepEqual(reads, ["matrix"]);
  assert.deepEqual(told, [["matrix"]]);
});

test("REQ-003: a Windows path is read as the same file", async () => {
  const { state, reads } = await opened();
  assert.deepEqual(await state.fileChanged("docs\\specs\\changes\\draft-pedidos\\questions.md"), [
    "questions",
    "matrix",
  ]);
  assert.deepEqual([...reads].sort(), ["matrix", "questions"]);
});

test("REQ-003: a file outside the specification reads nothing and tells nothing", async () => {
  const { state, reads, told } = await opened();
  assert.deepEqual(await state.fileChanged("packages/core/src/index.ts"), []);
  assert.deepEqual(reads, []);
  assert.deepEqual(told, []);
});

test("REQ-003: the new data is what a later request gets", async () => {
  const { state } = await opened();
  const before = await state.section("matrix");
  await state.fileChanged("features/auth/REQ-010.feature");
  assert.notDeepEqual(await state.section("matrix"), before);
});
