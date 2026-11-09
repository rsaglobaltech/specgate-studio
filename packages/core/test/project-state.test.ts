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
