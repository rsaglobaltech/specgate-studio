/** The project Build and Live's browser tests read (draft-build-live A1): sprich, faked. */
import type { StudioOptions } from "./support.js";

/** sprich's draft-pedidos (A1): REQ-030 ready, REQ-031 blocked by Q2, REQ-032 ready after it. */
export const SPRICH = [
  { id: "REQ-028", title: "Health", category: "DONE", needs: null },
  {
    id: "REQ-030",
    title: "Cancel an order",
    category: "NEEDS_EVERYTHING",
    needs: "a test and code",
    change: "draft-pedidos",
  },
  {
    id: "REQ-031",
    title: "Cancel until dispatch",
    category: "WAITING_FOR_ANSWER",
    needs: "an answer",
    change: "draft-pedidos",
    question: "Q2",
  },
  {
    id: "REQ-032",
    title: "Refund a cancelled order",
    category: "NEEDS_TEST",
    needs: "its test",
    change: "draft-pedidos",
  },
];

/** specgate's `--json` answers Build reads; `agent` is harness.config.yaml's. */
export function buildAnswers(agent: string | null): NonNullable<StudioOptions["specgate"]> {
  return {
    "harness report": {
      data: { report: { runs: 3, passed: 4, msPerDelivered: 720_000, estimatedCost: null } },
      findings: [],
      exitCode: 0,
    },
    "config list": {
      data: { config: { test_cmd: "npm test", ...(agent ? { agent } : {}) } },
      findings: [],
      exitCode: 0,
    },
    "change show draft-pedidos": {
      data: {
        change: {
          id: "draft-pedidos",
          config: { brief: "docs/brief.md", approved: "2026-11-10" },
          deltas: [],
        },
      },
      findings: [],
      exitCode: 0,
    },
  };
}

/** sprich's 325 uncommitted files (SCN-303): 200 in src/orders, 100 in src/web, 25 in test. */
export function files325(): string[] {
  return [
    ...Array.from({ length: 200 }, (_, i) => `src/orders/f${i}.ts`),
    ...Array.from({ length: 100 }, (_, i) => `src/web/c${i}.tsx`),
    ...Array.from({ length: 25 }, (_, i) => `test/t${i}.test.ts`),
  ];
}
