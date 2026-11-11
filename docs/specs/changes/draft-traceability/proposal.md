# Proposal: draft-traceability

## Intent

Phase 3 of the studio: the proof that each scenario is covered. The workbench
already has a Traceability view and a Traceability tab in the bottom panel, and
the editor a Trace action (REQ-042), with nothing behind them. A Reviewer needs
to see, scenario by scenario, what is linked and what is missing, and a
Developer needs a way from a gap to the missing test.

## Scope

In scope (docs/briefs/phase-3-proof-and-desktop.md, module traceability):

- One row per scenario: requirement, feature, test, code, status (REQ-121).
- Filters: gaps, without a test, waiting for an answer (REQ-122).
- "Fix" opens the scenario and proposes the missing test as a skeleton from its
  GIVEN/WHEN/THEN, with no agent and no cost; "Ask the agent" has the project's
  agent complete it, shown as a diff with its cost; nothing is written until
  confirmed (REQ-123, Q1).

Out of scope:

- Running the tests or marking a requirement from Traceability (`specgate apply`
  belongs to the changes module).
- The report built from the same data (draft-report).

## Approach

The core host reads the rows from specgate through `SpecgatePort` and keeps them
in memory (REQ-002); a saved test or feature refreshes only the matrix (REQ-003).
specgate 0.33.2 gives only a row count in `matrix --json`: the per-scenario
`rows[]` are asked of specgate in both the CLI and the API, expected in specgate
0.35.0, and REQ-121 and REQ-122 are built against them — no interim
per-requirement view (A5, A12, Q2). "Fix" goes through the help catalog:
a "?" and its notices in English and Spanish (draft-help).
