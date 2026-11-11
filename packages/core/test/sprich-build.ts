import {
  Builds,
  Commands,
  FakeHarness,
  InMemoryGit,
  type BuildsOptions,
  type CommandEvent,
  type SpecgateAnswer,
} from "../src/index.js";

/** The project Build's tests read (draft-build-live A1): sprich, as specgate answers for it. */

/** sprich's draft-pedidos (A1): REQ-030 ready, REQ-031 blocked by Q2, REQ-032 ready after it. */
export const SPRICH_STATUS = {
  requirements: [
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
    {
      id: "REQ-033",
      title: "Status implemented",
      category: "NEEDS_STATUS_UPDATE",
      needs: "its test is in place",
    },
  ],
};

/** `harness report --json` after past runs: 12 minutes a delivered requirement. */
export const REPORT = {
  report: { runs: 3, passed: 4, msPerDelivered: 720_000, estimatedCost: { total: 1.6 } },
};

export const ROOT = "/work/sprich";

/** sprich's 325 uncommitted files (SCN-303): 200 in src/orders, 100 in src/web, 25 in test. */
export function files325(): string[] {
  return [
    ...Array.from({ length: 200 }, (_, i) => `src/orders/f${i}.ts`),
    ...Array.from({ length: 100 }, (_, i) => `src/web/c${i}.tsx`),
    ...Array.from({ length: 25 }, (_, i) => `test/t${i}.test.ts`),
  ];
}

export function sprichBuilds(
  uncommitted: string[] = [],
  agent: string | null = "claude",
  more: Partial<BuildsOptions> = {},
) {
  const answers: Record<string, SpecgateAnswer> = {
    "harness report": { data: REPORT, findings: [], exitCode: 0 },
    "config list": { data: { config: agent ? { agent } : {} }, findings: [], exitCode: 0 },
  };
  const git = new InMemoryGit({ [ROOT]: { branch: "main", uncommitted } });
  const harness = new FakeHarness();
  const commands = new Commands({ run: async () => 0 });
  const events: CommandEvent[] = [];
  commands.onEvent((e) => events.push(e));
  const builds = new Builds({
    specgate: { call: async (args) => answers[args.join(" ")] ?? Promise.reject(new Error("no")) },
    sections: { section: async (s) => (s === "home" ? SPRICH_STATUS : { changes: [] }) },
    root: ROOT,
    git,
    harness,
    commands,
    ...more,
  });
  return { builds, git, harness, commands, events, commandEvents: events };
}
