/**
 * draft-traceability in the core: one row per scenario read from specgate
 * 0.34.0's `matrix.scenarios` (REQ-121), the filters and their counts
 * (REQ-122), and "Fix" — the missing test proposed as a skeleton from the
 * scenario, written only once confirmed; "Ask the agent" as a diff against
 * the skeleton with its cost (REQ-123). On fakes: no agent ever runs.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  Agent,
  Commands,
  Traceability,
  addedText,
  agentTestRequest,
  keeps,
  lineDiff,
  scenarioIn,
  sectionsFedBy,
  testPathFor,
  testSkeleton,
  testStyleOf,
  traceViewOf,
  type Section,
  type SpecgateAnswer,
} from "../src/index.js";

/** sprich's matrix as specgate 0.34.0 answers it (A1, A2): SCN-020b no test, SCN-031a no code. */
export const MATRIX = {
  matrix: {
    projectDir: "/sprich",
    derived: true,
    written: false,
    rows: 4,
    scenarios: [
      {
        requirement: "REQ-010",
        scenario: "SCN-010a",
        feature: "features/auth/REQ-010.feature",
        tests: ["test/auth/Login.test.ts"],
        code: ["src/auth/Login.ts"],
        status: "Verified",
        gaps: [],
        waiting: null,
      },
      {
        requirement: "REQ-020",
        scenario: "SCN-020a",
        feature: "features/pagos/REQ-020.feature",
        tests: ["test/pagos/Cart.test.ts"],
        code: ["src/pagos/Cart.ts"],
        status: "Approved",
        gaps: [],
        waiting: null,
      },
      // specgate 0.34.0 reads a scenario no test names as Draft: its requirement is Approved (A4).
      {
        requirement: "REQ-020",
        scenario: "SCN-020b",
        feature: "features/pagos/REQ-020.feature",
        tests: [],
        code: ["src/pagos/Cart.ts"],
        status: "Draft",
        gaps: ["test"],
        waiting: null,
      },
      {
        requirement: "REQ-031",
        scenario: "SCN-031a",
        feature: "features/pedidos/REQ-031.feature",
        tests: ["test/pedidos/Cancel.test.ts"],
        code: [],
        status: "Needs Clarification",
        gaps: ["code"],
        waiting: { question: "Q2", change: "draft-pedidos" },
      },
    ],
  },
};

export const HOME = {
  requirements: [
    { id: "REQ-010", title: "Sign in", capability: "auth" },
    { id: "REQ-020", title: "See the cart", capability: null },
    { id: "REQ-031", title: "Cancel an order", capability: null },
  ],
};

export const FEATURE = `Feature: See the cart

  @REQ-020 @SCN-020a
  Scenario: The cart with two lines
    Given a cart with two lines
    When the customer opens the cart
    Then the customer sees both lines and the total

  @REQ-020 @SCN-020b
  Scenario: The empty cart
    Given an empty cart
    When the customer opens the cart
    Then the customer sees that the cart is empty
`;

const CART_TEST = `import test from "node:test";
import assert from "node:assert/strict";
test("REQ-020 SCN-020a", () => assert.ok(true));
`;

test("REQ-121 SCN-361: two rows for REQ-020 — SCN-020a with its feature, test, code and Approved; SCN-020b with its feature, no test, a gap", () => {
  const view = traceViewOf(MATRIX, HOME);
  assert.equal(view.available, true);
  const rows = view.rows.filter((r) => r.requirement === "REQ-020");
  assert.equal(rows.length, 2, "one row per scenario, never one per requirement");
  const [a, b] = rows;
  assert.deepEqual(
    {
      scenario: a!.scenario,
      feature: a!.feature,
      tests: a!.tests,
      code: a!.code,
      status: a!.status,
      gaps: a!.gaps,
      title: a!.title,
    },
    {
      scenario: "SCN-020a",
      feature: "features/pagos/REQ-020.feature",
      tests: ["test/pagos/Cart.test.ts"],
      code: ["src/pagos/Cart.ts"],
      status: "Approved",
      gaps: [],
      title: "See the cart",
    },
  );
  assert.equal(b!.scenario, "SCN-020b");
  assert.equal(b!.feature, "features/pagos/REQ-020.feature");
  assert.deepEqual(b!.tests, []);
  assert.deepEqual(b!.gaps, ["test"]);
  assert.equal(
    b!.status,
    "Approved",
    "the requirement's status, the same on each of its rows (A4)",
  );
  assert.equal(view.rows.find((r) => r.requirement === "REQ-010")!.capability, "auth");
  assert.equal(view.withTest, 3);
  assert.equal(view.scenarios, 4);
});

test("REQ-121: no per-scenario rows from specgate (older than 0.34.0) — no interim view of one row per requirement (A12)", () => {
  const view = traceViewOf({ matrix: { derived: true, rows: 4 } }, HOME);
  assert.equal(view.available, false);
  assert.deepEqual(view.rows, []);
});

test("REQ-121: a row with no gaps given is a gap when it lacks a feature, a test or code (A3); Windows paths read with /", () => {
  const view = traceViewOf({
    matrix: {
      scenarios: [
        {
          requirement: "REQ-040",
          scenario: "SCN-040a",
          feature: null,
          tests: ["test\\x.test.ts"],
          code: [],
          status: "Draft",
          waiting: null,
        },
      ],
    },
  });
  assert.deepEqual(view.rows[0]!.gaps, ["feature", "code"]);
  assert.deepEqual(view.rows[0]!.tests, ["test/x.test.ts"]);
});

test("REQ-122 SCN-363: without a test keeps one row, SCN-020b, and says it keeps 1 row", () => {
  const view = traceViewOf(MATRIX, HOME);
  assert.deepEqual(
    view.rows.filter((r) => keeps("noTest", r)).map((r) => r.scenario),
    ["SCN-020b"],
  );
  assert.deepEqual(view.counts, { all: 4, gaps: 2, noTest: 1, waiting: 1 });
});

test("REQ-122 SCN-364: waiting for an answer keeps REQ-031's rows, each naming Q2 — no row of a requirement no question blocks", () => {
  const view = traceViewOf(MATRIX, HOME);
  const kept = view.rows.filter((r) => keeps("waiting", r));
  assert.deepEqual(
    kept.map((r) => [r.requirement, r.waiting?.question, r.waiting?.change]),
    [["REQ-031", "Q2", "draft-pedidos"]],
  );
  // Needs Clarification with no question named still waits (A3).
  const clarify = traceViewOf({
    matrix: {
      scenarios: [{ requirement: "REQ-050", scenario: "SCN-050a", status: "Needs Clarification" }],
    },
  });
  assert.ok(keeps("waiting", clarify.rows[0]!));
});

test("REQ-122 SCN-365: gaps keep SCN-020b and SCN-031a, each saying what it lacks — a test, and code", () => {
  const view = traceViewOf(MATRIX, HOME);
  assert.deepEqual(
    view.rows.filter((r) => keeps("gaps", r)).map((r) => [r.scenario, r.gaps]),
    [
      ["SCN-020b", ["test"]],
      ["SCN-031a", ["code"]],
    ],
  );
});

test("REQ-123: SCN-020b read from its feature — the line of its Scenario and one step per GIVEN, WHEN and THEN", () => {
  const s = scenarioIn(FEATURE.replace(/\n/g, "\r\n"), "SCN-020b")!;
  assert.equal(s.title, "The empty cart");
  assert.equal(s.line, 10);
  assert.deepEqual(
    s.steps.map((st) => `${st.keyword} ${st.text}`),
    [
      "GIVEN an empty cart",
      "WHEN the customer opens the cart",
      "THEN the customer sees that the cart is empty",
    ],
  );
  assert.equal(scenarioIn(FEATURE, "SCN-020c"), null);
});

test("REQ-123: the test goes where the module's tests are, named after the requirement, never over a file (A6)", () => {
  const row = {
    requirement: "REQ-020",
    scenario: "SCN-020b",
    feature: "features/pagos/REQ-020.feature",
    capability: null,
  };
  assert.equal(
    testPathFor(row, ["test/pagos/Cart.test.ts"], () => false),
    "test/pagos/REQ-020.test.ts",
  );
  assert.equal(
    testPathFor(row, ["test/pagos/Cart.test.ts"], (p) => p === "test/pagos/REQ-020.test.ts"),
    "test/pagos/REQ-020-SCN-020b.test.ts",
  );
  assert.equal(
    testPathFor(row, ["tests/cart.spec.js"], () => false),
    "tests/pagos/REQ-020.spec.js",
  );
  assert.equal(
    testPathFor(row, [], () => false),
    "test/pagos/REQ-020.test.ts",
  );
  assert.equal(
    testPathFor(row, ["tests/pagos/test_cart.py"], () => false),
    "tests/pagos/test_req_020.py",
  );
  assert.equal(testStyleOf("a.test.ts", 'import { test } from "vitest";'), "vitest");
  assert.equal(testStyleOf("a.test.js", 'const test = require("node:test");'), "node-test-cjs");
  assert.equal(testStyleOf("a.test.js", 'describe("x", () => it("y", () => {}));'), "jest");
  assert.equal(testStyleOf("a.test.ts", CART_TEST), "node-test");
});

test("REQ-123: the skeleton names REQ-020 and SCN-020b, one step per GIVEN, WHEN and THEN, and fails until written", () => {
  const scenario = scenarioIn(FEATURE, "SCN-020b")!;
  for (const style of ["node-test", "node-test-cjs", "vitest", "jest", "pytest"] as const) {
    const text = testSkeleton({
      requirement: "REQ-020",
      scenario,
      feature: "features/pagos/REQ-020.feature",
      style,
    });
    assert.match(text, /REQ-020/, style);
    assert.match(text, /SCN-020b/, style);
    for (const step of [
      "GIVEN an empty cart",
      "WHEN the customer opens the cart",
      "THEN the customer sees",
    ])
      assert.ok(text.includes(step), `${style}: ${step}`);
    assert.match(text, /assert\.fail|throw new Error|raise AssertionError/, style);
  }
});

/** sprich's files and state in memory; what is written is recorded. */
function sprich(opts: { files?: Record<string, string>; agent?: Agent } = {}) {
  const disk: Record<string, string> = {
    "features/pagos/REQ-020.feature": FEATURE,
    "test/pagos/Cart.test.ts": CART_TEST,
    ...opts.files,
  };
  const writes: string[] = [];
  const changed: string[] = [];
  let matrix: unknown = structuredClone(MATRIX);
  const trace = new Traceability({
    sections: {
      section: async (s: Section) => (s === "matrix" ? matrix : HOME),
      fileChanged: async (p: string) => {
        changed.push(p);
        if (sectionsFedBy(p).includes("matrix")) matrix = refreshed(disk);
      },
    },
    files: {
      list: async () => Object.keys(disk),
      read: async (p) => {
        if (!(p in disk)) throw new Error(`no ${p}`);
        return disk[p]!;
      },
      create: async (p) => {
        if (p in disk) throw new Error(`${p} already exists`);
        disk[p] = "";
      },
      write: async (p, t) => {
        writes.push(p);
        disk[p] = t;
      },
    },
    ...(opts.agent ? { agent: opts.agent } : {}),
  });
  return { trace, disk, writes, changed };
}

/** The matrix as specgate would read it again: a test naming SCN-020b links it. */
function refreshed(disk: Record<string, string>) {
  const m = structuredClone(MATRIX);
  const named = Object.keys(disk).filter(
    (p) => p.startsWith("test/") && disk[p]!.includes("SCN-020b"),
  );
  const row = m.matrix.scenarios.find((r) => r.scenario === "SCN-020b")!;
  if (named.length) Object.assign(row, { tests: named, gaps: [], status: "Approved" });
  return m;
}

test("REQ-123 SCN-366: Fix on SCN-020b — the feature at SCN-020b, the file test/pagos/REQ-020.test.ts, a skeleton naming REQ-020 and SCN-020b; no agent, nothing written", async () => {
  const { trace, writes } = sprich();
  const fixed = await trace.fix("REQ-020", "SCN-020b");
  assert.ok(fixed.ok, JSON.stringify(fixed));
  const p = fixed.ok ? fixed.proposal : null!;
  assert.equal(p.feature, "features/pagos/REQ-020.feature");
  assert.equal(p.line, 10);
  assert.equal(p.path, "test/pagos/REQ-020.test.ts");
  assert.match(p.text, /REQ-020 SCN-020b: The empty cart/);
  assert.match(p.text, /import test from "node:test";/, "the project's own test style");
  assert.equal(p.steps.length, 3);
  assert.deepEqual(writes, [], "no file of sprich changed");
  assert.equal((await trace.fix("REQ-020", "SCN-020a")).ok, false, "SCN-020a has its test: no Fix");
});

test("REQ-123 SCN-367: the proposal confirmed — test/pagos/REQ-020.test.ts written, SCN-020b no longer without a test, the notice names the file and specgate apply REQ-020", async () => {
  const { trace, disk, writes, changed } = sprich();
  const fixed = await trace.fix("REQ-020", "SCN-020b");
  const done = await trace.confirm("REQ-020", "SCN-020b");
  assert.ok(done.ok, JSON.stringify(done));
  assert.equal(done.written, "test/pagos/REQ-020.test.ts");
  assert.deepEqual(writes, ["test/pagos/REQ-020.test.ts"]);
  assert.equal(disk["test/pagos/REQ-020.test.ts"], fixed.ok ? fixed.proposal.text : "");
  assert.deepEqual(changed, ["test/pagos/REQ-020.test.ts"], "the matrix read again");
  const row = (await trace.view()).rows.find((r) => r.scenario === "SCN-020b")!;
  assert.ok(!row.gaps.includes("test"));
  for (const lang of ["en", "es"] as const) {
    const n = done.notice[lang];
    assert.equal(n.tone, "ok");
    assert.match(`${n.ran} ${n.wrote}`, /test\/pagos\/REQ-020\.test\.ts/, lang);
    assert.equal(n.next, "specgate apply REQ-020");
  }
});

test("REQ-123: confirming never overwrites — a file there since is refused and nothing is written", async () => {
  const { trace, writes } = sprich();
  const first = await trace.fix("REQ-020", "SCN-020b");
  assert.ok(first.ok);
  const { trace: other } = sprich({ files: { "test/pagos/REQ-020.test.ts": "// mine\n" } });
  const again = await other.fix("REQ-020", "SCN-020b");
  assert.ok(again.ok && again.proposal.path === "test/pagos/REQ-020-SCN-020b.test.ts");
  assert.deepEqual(writes, []);
});

test("REQ-123 SCN-368: the proposal cancelled — nothing written, SCN-020b still a gap, the notice says nothing was written", async () => {
  const { trace, writes } = sprich();
  await trace.fix("REQ-020", "SCN-020b");
  const done = await trace.cancel("REQ-020", "SCN-020b");
  assert.equal(done.written, null);
  assert.deepEqual(writes, []);
  assert.ok(
    (await trace.view()).rows.find((r) => r.scenario === "SCN-020b")!.gaps.includes("test"),
  );
  assert.match(done.notice.en.wrote, /Nothing was written/);
  assert.match(done.notice.es.wrote, /No se escribió nada/);
});

test("REQ-123 SCN-369: Ask the agent — specgate's plan of the completed test, shown against the skeleton with its cost; nothing written until confirmed", async () => {
  const calls: string[] = [];
  let request = "";
  const completed = (skeleton: string) =>
    skeleton.replace(/  assert\.fail\(.*\);\n/, "  assert.equal(cart([]).empty, true);\n");
  const plan = (text: string) => ({
    plan: {
      id: "20261112-120000-aaaa",
      request,
      mode: "spec",
      created: "2026-11-12T12:00:00.000Z",
      files: [
        {
          path: "test/pagos/REQ-020.test.ts",
          change: "add",
          why: "SCN-020b",
          diff: [
            "--- /dev/null",
            "+++ b/test/pagos/REQ-020.test.ts",
            `@@ -0,0 +1,${text.split("\n").length - 1} @@`,
            ...text
              .replace(/\n$/, "")
              .split("\n")
              .map((l) => `+${l}`),
            "",
          ].join("\n"),
        },
      ],
      then: [],
      read: ["features/pagos/REQ-020.feature"],
      usage: { input: 2100, output: 400, cost: 0.03 },
    },
  });
  let skeleton = "";
  const specgate = {
    call: async (args: readonly string[]): Promise<SpecgateAnswer> => {
      calls.push(args.slice(0, 2).join(" "));
      if (args[1] === "ask") {
        request = args[2]!;
        return { data: plan(completed(skeleton)), findings: [], exitCode: 0 };
      }
      if (args[1] === "apply")
        return {
          data: {
            applied: {
              id: args[2],
              written: [{ path: "test/pagos/REQ-020.test.ts", change: "add" }],
              then: [],
            },
          },
          findings: [],
          exitCode: 0,
        };
      return { data: { discarded: { id: args[2] } }, findings: [], exitCode: 0 };
    },
  };
  const agent = new Agent({ commands: new Commands({ run: async () => 0 }), specgate });
  const { trace, writes } = sprich({ agent });
  const fixed = await trace.fix("REQ-020", "SCN-020b");
  skeleton = fixed.ok ? fixed.proposal.text : "";
  const asked = await trace.ask("REQ-020", "SCN-020b");
  assert.ok(asked.ok, JSON.stringify(asked));
  const a = asked.ok ? asked : null!;
  assert.equal(request, agentTestRequest(a.proposal), "the skeleton and the scenario only");
  assert.match(request, /@REQ-020/);
  assert.match(request, /@features\/pagos\/REQ-020\.feature/);
  assert.equal(a.text, completed(skeleton));
  assert.match(a.diff!, /^-  assert\.fail/m);
  assert.match(a.diff!, /^\+  assert\.equal\(cart\(\[\]\)\.empty, true\);/m);
  assert.equal(a.tokens, 2500);
  assert.equal(a.cost, 0.03);
  assert.deepEqual(writes, [], "nothing written by the plan");
  assert.ok(!calls.includes("agent apply"));
  const done = await trace.confirmAgent(a.entry.n, "REQ-020", "SCN-020b", a.proposal.path);
  assert.ok(done.ok, JSON.stringify(done));
  assert.equal(done.written, "test/pagos/REQ-020.test.ts");
  assert.ok(calls.includes("agent apply"), "specgate writes it, never the studio");
  assert.deepEqual(writes, []);
  assert.equal(done.notice.en.next, "specgate apply REQ-020");
});

test("REQ-123: Ask the agent with a plan that leaves the test out (specgate 0.34.0's edit_refused) — said, nothing written", async () => {
  const specgate = {
    call: async (args: readonly string[]): Promise<SpecgateAnswer> => ({
      data: {
        plan: {
          id: null,
          request: args[2],
          mode: "spec",
          files: [],
          then: [],
          read: [],
          usage: { input: 1000, output: 200 },
        },
      },
      findings: [
        {
          severity: "warning",
          code: "edit_refused",
          message:
            "The agent changed test/pagos/REQ-020.test.ts, outside the specification: left out of the plan.",
        },
      ],
      exitCode: 0,
    }),
  };
  const agent = new Agent({ commands: new Commands({ run: async () => 0 }), specgate });
  const { trace, writes } = sprich({ agent });
  const asked = await trace.ask("REQ-020", "SCN-020b");
  assert.ok(asked.ok);
  assert.equal(asked.ok && asked.text, null);
  assert.equal(asked.ok && asked.findings[0]!.code, "edit_refused");
  assert.deepEqual(writes, []);
});

test("REQ-123: a diff against the skeleton, and a new file's text from its diff", () => {
  assert.equal(addedText("--- /dev/null\n+++ b/x\n@@ -0,0 +1,2 @@\n+a\n+b\n"), "a\nb\n");
  assert.equal(
    lineDiff("a\nb\n", "a\nc\n"),
    "--- skeleton\n+++ agent\n@@ -1,2 +1,2 @@\n a\n-b\n+c\n",
  );
});

test("REQ-123 A9: a saved test refreshes only the matrix; code still feeds nothing", () => {
  assert.deepEqual(sectionsFedBy("test/pagos/REQ-020.test.ts"), ["matrix"]);
  assert.deepEqual(sectionsFedBy("src/pagos/cart.spec.ts"), ["matrix"]);
  assert.deepEqual(sectionsFedBy("src/orders.ts"), []);
});
