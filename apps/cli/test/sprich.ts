/**
 * sprich as the boards show it (draft-design-conformance A1), for the
 * browser tests of the design and of the workbench.
 */
import { studio } from "./support.js";

export type Opts = Parameters<typeof studio>[0];

export const R = (id: string, title: string, category: string, change?: string) => ({
  id,
  title,
  category,
  needs: category === "DONE" ? null : "a test and code",
  ...(change ? { change } : {}),
});

/** sprich as the boards show it (A1): 24 requirements, 15 built, draft-pedidos with Q1 and Q2. */
export const SPRICH_REQS = [
  ...Array.from({ length: 15 }, (_, i) => R(`REQ-0${10 + i}`, `Built ${i}`, "DONE")),
  R("REQ-025", "Pay by card", "NEEDS_EVERYTHING"),
  R("REQ-026", "Invoice", "NEEDS_EVERYTHING"),
  R("REQ-027", "Refund", "NEEDS_EVERYTHING"),
  R("REQ-028", "Receipt", "NEEDS_TEST"),
  R("REQ-031", "Cancel an order", "WAITING_FOR_ANSWER", "draft-pedidos"),
  R("REQ-032", "Order state", "NEEDS_EVERYTHING", "draft-pedidos"),
  R("REQ-033", "Repeat an order", "NEEDS_EVERYTHING", "draft-pedidos"),
  R("REQ-034", "Free shipping from an amount", "WAITING_FOR_ANSWER", "draft-pedidos"),
  R("REQ-035", "Track the parcel", "NEEDS_EVERYTHING", "draft-pedidos"),
];
export const Q1 = {
  id: "Q1",
  change: "draft-pedidos",
  text: "From what amount is shipping free?",
  blocks: ["REQ-034"],
  options: ["40 €", "50 €", "60 €"],
  asked: "brief",
};
export const Q2 = {
  id: "Q2",
  change: "draft-pedidos",
  text: "Until when can an order be cancelled?",
  blocks: ["REQ-031"],
  options: ["Until it ships", "24 h before it ships"],
  asked: "draft",
};
export const Q4 = {
  id: "Q4",
  change: "draft-pagos",
  text: "Pay in instalments?",
  blocks: ["REQ-022"],
  answer: "No",
  asked: "draft",
};

/** `change show <id> --json`. */
export const shown = (id: string, config: Record<string, unknown>) => ({
  data: { change: { id, config: { specgate_change_version: 1, ...config }, deltas: [] } },
  findings: [],
  exitCode: 0,
});

export function sprich(opts: Opts = {}) {
  return studio({
    homeRequirements: SPRICH_REQS as never,
    next: 'specgate answer Q1 "…" --change draft-pedidos',
    questions: { open: [Q1, Q2], answered: [Q4] },
    ...opts,
    sections: {
      changes: {
        changes: [{ id: "draft-pedidos" }, { id: "add-coupons" }, { id: "auth-reset" }],
      },
      home: {
        total: 24,
        pending: 9,
        requirements: SPRICH_REQS,
        nextCommand: 'specgate answer Q1 "…" --change draft-pedidos',
      },
      // 12 of the 15 built have a test that passes (A1).
      report: {
        total: 19,
        requirements: SPRICH_REQS.slice(0, 15).map((r, i) => ({
          requirement: r.id,
          featureFile: `\`features/${i < 6 ? "auth" : i < 13 ? "catalogo" : "pagos"}/${r.id}.feature\``,
          testExists: i < 12,
        })),
      },
      ...opts.sections,
    },
    specgate: {
      "change show draft-pedidos": shown("draft-pedidos", { brief: "docs/brief.md" }),
      "change show add-coupons": shown("add-coupons", { approved: "2026-11-09" }),
      "change show auth-reset": shown("auth-reset", { approved: "2026-11-09" }),
      "harness report": {
        data: {
          report: { runs: 18, passed: 15, msPerDelivered: 520_000, estimatedCost: { total: 4.8 } },
        },
        findings: [],
        exitCode: 0,
      },
      "config list": { data: { config: { agent: "claude -p" } }, findings: [], exitCode: 0 },
      "propose --from-brief": {
        data: {
          draft: {
            modules: ["auth", "catalogo", "pagos", "pedidos"].map((m) => ({
              module: m,
              state: m === "pedidos" ? "ready" : "archived",
            })),
          },
        },
        findings: [],
        exitCode: 0,
      },
      ...opts.specgate,
    },
  });
}
