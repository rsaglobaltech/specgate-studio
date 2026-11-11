# Assumptions — draft-traceability

What the brief does not say, chosen so the scenarios can be tested. Each is to
confirm by the person reviewing the draft.

| # | Assumption | Used in | Why | Status |
|---|---|---|---|---|
| A1 | The example is sprich: its requirement REQ-020 of the module `pagos`, with the scenarios SCN-020a and SCN-020b in `features/pagos/REQ-020.feature`, a test that names SCN-020a only, and REQ-020 Approved | REQ-121, REQ-122, REQ-123, SCN-361 … SCN-368 | The brief names SCN-020b; the rest is the smallest project around it | to confirm |
| A2 | REQ-031 blocked by the open question Q2 of draft-pedidos, and SCN-031a with a test and no code | REQ-122, SCN-364, SCN-365 | The values phase 2's drafts already use (draft-build-live A1) | to confirm |
| A3 | A row is a gap when its scenario lacks a feature file, a test that names it, or code; "without a test" is the subset that lacks a test; "waiting for an answer" is the rows whose requirement an open question blocks (`specgate questions --json`, `blocks`) or that is in Needs Clarification | REQ-121, REQ-122 | The brief names the filters, not what each keeps | to confirm |
| A4 | The status shown is the requirement's status from its trace (Draft, Approved, Implemented, Verified, Released, Deprecated, Needs Clarification) | REQ-121, SCN-361 | specgate's statuses; the brief says "status" | to confirm |
| A5 | The rows come from specgate's JSON. **specgate 0.33.2 does not give them**: `specgate matrix --json` (and the API's `matrix()`) returns only `rows: <count>`, and `specgate report --format json` gives one row per requirement with a single `scenarioId`, `featureFile`, `testArtifact` and `technicalArtifact`. The studio needs `specgate matrix --json` to list `rows[]`, one per scenario: `requirement`, `scenario`, `feature`, `tests[]`, `code[]`, `status`, `gaps[]` — a specgate change before REQ-121 is built (ADR-0003) | REQ-121, REQ-122, Q2 | The studio never parses `traceability.md` | to confirm |
| A6 | The proposed test goes where the project keeps tests for that module, named after the requirement (`test/pagos/REQ-020.test.ts` in the example), and names REQ-020 and SCN-020b so specgate links it | REQ-123, SCN-366, SCN-367 | specgate links a test by the ids it mentions | to confirm |
| A7 | Confirming writes only that test file; it never commits, never runs the tests and never marks the requirement; the next step it names is `specgate apply REQ-020` | REQ-123, SCN-367 | "nothing is written without confirmation"; apply is the gate's job | to confirm |
| A8 | "Fix" has a "?" and its notices (written, or nothing written) in English and Spanish in the help catalog, and the tests fail without them (draft-help REQ-061 … REQ-065); filters and rows are read-only and need no "?" (draft-help A8) | REQ-123, SCN-367, SCN-368 | The studio explains itself | to confirm |
| A9 | Traceability shows the same rows in the desktop app and the browser: the core host serves both (ADR-0001), from its memory after the first read (REQ-002), and a saved test or feature refreshes only the matrix (REQ-003) | REQ-121, SCN-362 | The core host's capability | to confirm |
| A10 | A filter's count is shown beside its name ("1 row" in the example) | REQ-122, SCN-363 | The brief names the filters, not their counts | to confirm |
