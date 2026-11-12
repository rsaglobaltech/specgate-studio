/**
 * sprich for Traceability's browser tests (draft-traceability A1, A2): its
 * matrix as specgate 0.34.0 answers it, read again from the files on disk;
 * REQ-020's feature and the test of SCN-020a; the agent's plan recorded.
 */
import {
  agentTestRequest,
  scenarioIn,
  testSkeleton,
  type SpecgateAnswer,
} from "@specgate-studio/core";
import { sprich, type Opts } from "./sprich.js";

export const FEATURE = "features/pagos/REQ-020.feature";
export const TEST = "test/pagos/REQ-020.test.ts";
const FEATURE_TEXT = `Feature: See the cart

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

/** The matrix specgate answers for what is on disk: a test naming SCN-020b links it. */
function matrix(disk: Record<string, string>) {
  const naming = (id: string) =>
    Object.keys(disk).filter((p) => p.startsWith("test/") && disk[p]!.includes(id));
  const b = naming("SCN-020b");
  return {
    matrix: {
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
          feature: FEATURE,
          tests: naming("SCN-020a"),
          code: ["src/pagos/Cart.ts"],
          status: "Approved",
          gaps: [],
          waiting: null,
        },
        {
          requirement: "REQ-020",
          scenario: "SCN-020b",
          feature: FEATURE,
          tests: b,
          code: ["src/pagos/Cart.ts"],
          // specgate 0.34.0 reads a scenario no test names as Draft; its requirement is Approved.
          status: b.length ? "Approved" : "Draft",
          gaps: b.length ? [] : ["test"],
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
}

/** The skeleton "Fix" proposes for SCN-020b, as the studio writes it. */
export const SKELETON = testSkeleton({
  requirement: "REQ-020",
  scenario: scenarioIn(FEATURE_TEXT, "SCN-020b")!,
  feature: FEATURE,
  style: "node-test",
});
export const ID = "20261112-120000-aaaa";
export const COMPLETED = SKELETON.replace(
  /  assert\.fail\(.*\);\n/,
  "  const cart = openCart([]);\n  assert.equal(cart.empty, true);\n",
);
export const REQUEST = agentTestRequest({
  requirement: "REQ-020",
  scenario: "SCN-020b",
  title: "The empty cart",
  feature: FEATURE,
  line: 10,
  path: TEST,
  text: SKELETON,
  steps: [],
});

/** sprich with REQ-020's feature and the test of SCN-020a; the agent's plan recorded. */
export function withTrace(extra: Opts = {}) {
  const apply = (_: unknown, disk: Record<string, string>): SpecgateAnswer => {
    // specgate writes the plan, byte for byte: the studio never does.
    disk[TEST] = COMPLETED;
    return {
      data: { applied: { id: ID, written: [{ path: TEST, change: "add" }], then: [] } },
      findings: [],
      exitCode: 0,
    };
  };
  return sprich({
    files: {
      "docs/brief.md": "# brief\n",
      "spec.md": "# spec.md\n",
      [FEATURE]: FEATURE_TEXT,
      "test/pagos/Cart.test.ts": CART_TEST,
    },
    ...extra,
    sections: { matrix: (disk: Record<string, string>) => matrix(disk), ...extra.sections },
    specgate: {
      [`agent ask ${REQUEST} --plan`]: {
        data: {
          plan: {
            id: ID,
            request: REQUEST,
            mode: "spec",
            created: "2026-11-12T12:00:00.000Z",
            files: [
              {
                path: TEST,
                change: "add",
                why: "SCN-020b",
                diff: [
                  `diff --git a/${TEST} b/${TEST}`,
                  "new file mode 100644",
                  "--- /dev/null",
                  `+++ b/${TEST}`,
                  `@@ -0,0 +1,${COMPLETED.split("\n").length - 1} @@`,
                  ...COMPLETED.replace(/\n$/, "")
                    .split("\n")
                    .map((l) => `+${l}`),
                  "",
                ].join("\n"),
              },
            ],
            then: [],
            read: [FEATURE],
            usage: { input: 2100, output: 400, cost: 0.03 },
          },
        },
        findings: [],
        exitCode: 0,
      },
      [`agent apply ${ID}`]: apply,
      [`agent discard ${ID}`]: { data: { discarded: { id: ID } }, findings: [], exitCode: 0 },
      ...extra.specgate,
    },
  });
}
