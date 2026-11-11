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
