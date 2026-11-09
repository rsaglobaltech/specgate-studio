/**
 * draft-core-host — commands the host runs (REQ-005, REQ-006, REQ-007).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { Commands, type CommandEvent, type ProcessRunner } from "../src/index.js";

/** A runner that writes `chunks`, then ends with `exit`; `hold` keeps it running until released. */
function fakeRunner(script: (args: readonly string[]) => { chunks: string[]; exit: number }) {
  const seen: string[][] = [];
  let release: () => void = () => undefined;
  let hold = false;
  const runner: ProcessRunner = {
    async run(args, onOutput) {
      seen.push([...args]);
      const { chunks, exit } = script(args);
      for (const chunk of chunks) onOutput(chunk);
      if (hold) await new Promise<void>((ok) => (release = ok));
      return exit;
    },
  };
  return {
    runner,
    seen,
    holdNext: () => (hold = true),
    release: () => {
      hold = false;
      release();
    },
  };
}

const gate = () =>
  fakeRunner((args) =>
    args[0] === "apply"
      ? { chunks: ["✖ REQ-007 has no test that names it yet\n"], exit: 1 }
      : { chunks: ["✔ Specification\n", "✔ Tests\n", "✔ Gate passed\n"], exit: 0 }
  );

function follow(commands: Commands) {
  const events: CommandEvent[] = [];
  commands.onEvent((e) => events.push(e));
  return events;
}

// ── REQ-005: a command followed as events ───────────────────────────────

test("REQ-005 SCN-009: Check is followed as started, each stage as output, and ended with exit code 0", async () => {
  const fake = gate();
  const commands = new Commands(fake.runner);
  const events = follow(commands);
  const result = await commands.run({ name: "check" });
  assert.equal(result.ok, true);
  assert.deepEqual(
    events.map((e) => e.type),
    ["started", "output", "output", "output", "ended"]
  );
  assert.equal(events[0]?.type === "started" && events[0].command, "specgate check");
  assert.deepEqual(
    events.filter((e) => e.type === "output").map((e) => (e.type === "output" ? e.chunk : "")),
    ["✔ Specification\n", "✔ Tests\n", "✔ Gate passed\n"]
  );
  const ended = events.at(-1);
  assert.equal(ended?.type === "ended" && ended.exitCode, 0);
  assert.equal(new Set(events.map((e) => e.run)).size, 1, "one run id for all its events");
});

test("REQ-005 SCN-010: a refused apply is followed to its end with exit code 1", async () => {
  const commands = new Commands(gate().runner);
  const events = follow(commands);
  const result = await commands.run({ name: "apply", req: "REQ-007" });
  assert.equal(result.ok && result.exitCode, 1);
  assert.equal(events[0]?.type === "started" && events[0].command, "specgate apply REQ-007");
  const ended = events.at(-1);
  assert.equal(ended?.type === "ended" && ended.exitCode, 1);
});

// ── REQ-006: one write command at a time ────────────────────────────────

test("REQ-006 SCN-011: Archive while apply runs is refused with write_busy, naming the apply; nothing archived", async () => {
  const fake = gate();
  const commands = new Commands(fake.runner);
  fake.holdNext();
  const applying = commands.run({ name: "apply", req: "REQ-007" });
  const archive = await commands.run({ name: "archive", change: "add-coupons" });
  assert.deepEqual(archive, {
    ok: false,
    code: "write_busy",
    message: "specgate apply REQ-007 is running: wait for it to end.",
  });
  assert.equal(fake.seen.filter((a) => a[0] === "archive").length, 0, "archive never ran");
  fake.release();
  await applying;
});

test("REQ-006 SCN-012: a preference saved from another client while apply runs is refused and not written", async () => {
  const fake = gate();
  const commands = new Commands(fake.runner);
  fake.holdNext();
  const applying = commands.run({ name: "apply", req: "REQ-007" });
  const saved = await commands.run({ name: "config-set", key: "test_cmd", value: "pnpm test" });
  assert.equal(!saved.ok && saved.code, "write_busy");
  assert.match(!saved.ok ? saved.message : "", /specgate apply REQ-007/);
  assert.equal(fake.seen.some((a) => a[0] === "config"), false);
  fake.release();
  await applying;
  // Once it ended, the next write runs.
  assert.equal((await commands.run({ name: "config-set", key: "test_cmd", value: "pnpm test" })).ok, true);
});

test("REQ-006: a read command runs while a write runs", async () => {
  const fake = gate();
  const commands = new Commands(fake.runner);
  fake.holdNext();
  const applying = commands.run({ name: "apply", req: "REQ-007" });
  fake.release();
  assert.equal((await commands.run({ name: "check" })).ok, true);
  await applying;
});

// ── REQ-007: arguments as an array ──────────────────────────────────────

test("REQ-007 SCN-013: a change id with shell characters reaches the runner as one argument", async () => {
  const fake = gate();
  await new Commands(fake.runner).run({ name: "change-validate", change: "add-coupons; rm -rf ." });
  assert.deepEqual(fake.seen, [["change", "validate", "add-coupons; rm -rf ."]]);
});
