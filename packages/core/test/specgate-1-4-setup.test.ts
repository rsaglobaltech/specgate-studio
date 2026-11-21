/**
 * specgate-1-4-setup in the core: an undecided stack in the readiness list
 * and on Home (REQ-228), stack and testing in Settings (REQ-229), and the
 * adoption baseline told by its feature and title — left out of Home's
 * counters (REQ-230) and of Build until named (REQ-101).
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BASELINE,
  Settings,
  baselineOf,
  buildList,
  commandLine,
  nextStep,
  pendingBaseline,
  readiness,
  undecidedOf,
  type SpecgateAnswer,
} from "../src/index.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KEYS = JSON.parse(
  fs.readFileSync(
    [
      path.join(HERE, "fixtures", "config-keys-1.4.json"),
      path.join(HERE, "..", "..", "test", "fixtures", "config-keys-1.4.json"),
    ].find((p) => fs.existsSync(p))!,
    "utf8",
  ),
) as { keys: unknown[] };

/** `status --json` and `report --json` as specgate 1.4.2 answers them right after adoption. */
const adopted = (title: string, uc: string) => ({
  status: {
    total: 1,
    pending: 1,
    requirements: [
      { id: "REQ-001", title, category: "NEEDS_EVERYTHING", needs: "a test and code" },
    ],
    next: { command: 'specgate new "<a behaviour you rely on>"' },
  },
  report: {
    requirements: [
      {
        requirement: "REQ-001",
        category: "NEEDS_EVERYTHING",
        title: `UC-001 ${uc}`,
        featureFile: "`features/adoption/baseline.feature`",
        featureExists: true,
        testExists: false,
      },
    ],
  },
});
const SHOP = adopted("Preserve existing behaviour", "Preserve existing behaviour");
const NOTES = adopted("Build and test the project", "Build and test the project");

test("REQ-228 SCN-1002: an empty folder adopted — Stack and Testing to decide, each with a field; Home's next step is Decide the stack", () => {
  const config = { stack: "TBD", testing: "TBD", agent: "claude -p < {prompt_file}" };
  const items = readiness(config, null);
  assert.deepEqual(items.slice(0, 2), [
    { id: "stack", value: null, undecided: true },
    { id: "testing", value: null, undecided: true },
  ]);
  assert.deepEqual(undecidedOf(config), ["stack", "testing"]);
  // Before Build, and before what `status` names.
  const next = nextStep(NOTES.status, null, [], undecidedOf(config));
  assert.deepEqual(next, { kind: "stack", keys: ["stack", "testing"] });
  assert.deepEqual(undecidedOf({ stack: "Node.js", testing: "TBD" }), ["testing"]);
});

test("REQ-228 SCN-1003: the stack decided from the readiness list runs `config set stack`", () => {
  assert.deepEqual(
    commandLine({ name: "config-set", key: "stack", value: "TypeScript, Node 22" }),
    {
      args: ["config", "set", "stack", "TypeScript, Node 22"],
      write: true,
    },
  );
  assert.deepEqual(readiness({ stack: "TypeScript, Node 22", testing: "TBD" }, null).slice(0, 2), [
    { id: "stack", value: "TypeScript, Node 22" },
    { id: "testing", value: null, undecided: true },
  ]);
});

test("REQ-228 SCN-1004: a stack adoption detected — Stack and Testing set, the next step is not Decide the stack", () => {
  const config = { stack: "Node.js", testing: "npm test", test_cmd: "npm test" };
  assert.deepEqual(readiness(config, null).slice(0, 2), [
    { id: "stack", value: "Node.js" },
    { id: "testing", value: "npm test" },
  ]);
  assert.deepEqual(undecidedOf(config), []);
  assert.notEqual(nextStep(SHOP.status, null, [], undecidedOf(config)).kind, "stack");
  // A specgate that gives no stack: nothing to decide, the list as before.
  assert.deepEqual(undecidedOf({}), []);
  assert.deepEqual(
    readiness({}, null).map((i) => i.id),
    ["tests", "agent", "architecture", "ci"],
  );
});

test("REQ-229 SCN-1005: Stack and Testing under Preferences, in English and Spanish, kept in AGENTS.md", async () => {
  const specgate = {
    call: async (args: readonly string[]): Promise<SpecgateAnswer> => {
      const key = args.join(" ");
      if (key === "config keys") return { data: KEYS, findings: [], exitCode: 0 };
      if (key === "config list")
        return {
          data: {
            config: { stack: "TypeScript 5", testing: "node:test" },
            files: { stack: "AGENTS.md", testing: "AGENTS.md" },
          },
          findings: [],
          exitCode: 0,
        };
      throw new Error(`no answer for ${key}`);
    },
  };
  const { settings } = await new Settings({ specgate }).view("", "en");
  const stack = settings.find((s) => s.key === "stack")!;
  const testing = settings.find((s) => s.key === "testing")!;
  assert.equal(stack.section, "preferences");
  assert.equal(stack.value, "TypeScript 5");
  assert.equal(stack.file, "AGENTS.md");
  assert.equal(testing.section, "preferences");
  assert.equal(testing.file, "AGENTS.md");
  assert.equal(stack.name.en, "Stack");
  assert.equal(testing.name.en, "Testing");
  for (const s of [stack, testing]) {
    assert.notEqual(s.name.es, s.key);
    assert.ok(s.description.es && s.description.es !== s.description.en, s.key);
  }
  assert.ok(commandLine({ name: "settings-save", key: "stack", value: "TypeScript 5" }));
});

test("REQ-230 SCN-1006: shop just adopted — REQ-001 Preserve existing behaviour is the baseline, left out of Home's counters while pending", () => {
  assert.equal(baselineOf(SHOP.status, SHOP.report), "REQ-001");
  assert.equal(pendingBaseline(SHOP.status, SHOP.report), "REQ-001");
  // Delivered, it counts again.
  const done = {
    ...SHOP.status,
    requirements: [{ ...SHOP.status.requirements[0]!, category: "DONE" }],
  };
  assert.equal(pendingBaseline(done, SHOP.report), null);
});

test("REQ-230 SCN-1007: an empty folder's baseline, Build and test the project, counts", () => {
  assert.equal(baselineOf(NOTES.status, NOTES.report), null);
  assert.equal(pendingBaseline(NOTES.status, NOTES.report), null);
  // Its title alone is not enough: the baseline's feature names it.
  const elsewhere = {
    requirements: [{ ...SHOP.report.requirements[0]!, featureFile: "features/core/x.feature" }],
  };
  assert.equal(baselineOf(SHOP.status, elsewhere), null);
});

test("REQ-230: a project adopted before specgate 1.4 keeps REQ-000 as its baseline", () => {
  const status = {
    requirements: [{ id: "REQ-000", title: "Health baseline", category: "NEEDS_EVERYTHING" }],
  };
  assert.equal(BASELINE, "REQ-000");
  assert.equal(baselineOf(status, null), "REQ-000");
  assert.equal(baselineOf({ requirements: [] }, null), null);
});

test("REQ-101: Build leaves out REQ-001, the baseline REQ-230 tells, until it is named", () => {
  const status = {
    requirements: [
      ...SHOP.status.requirements,
      { id: "REQ-002", title: "Totals", category: "NEEDS_EVERYTHING" },
    ],
  };
  const baseline = baselineOf(status, SHOP.report);
  const unnamed = buildList(status, new Set(), null, {}, null, {}, null, baseline);
  assert.deepEqual(
    unnamed.ready.map((r) => r.id),
    ["REQ-002"],
  );
  const named = buildList(status, new Set(), null, {}, null, {}, "REQ-001", baseline);
  assert.deepEqual(
    named.ready.map((r) => r.id),
    ["REQ-001", "REQ-002"],
  );
  // An empty folder's REQ-001 is no baseline: Build lists it.
  const notes = buildList(NOTES.status, new Set(), null, {}, null, {}, null, null);
  assert.deepEqual(
    notes.ready.map((r) => r.id),
    ["REQ-001"],
  );
});
