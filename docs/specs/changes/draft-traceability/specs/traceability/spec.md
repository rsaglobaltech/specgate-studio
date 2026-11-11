# Delta — traceability

## ADDED Requirements

### Requirement: REQ-121 — One row per scenario: requirement, feature, test, code, status

<!-- specgate:trace actor=Reviewer kind=functional -->

The system SHALL show in Traceability one row for every scenario of the project, each naming its requirement, its feature file, the tests that name it, the code that implements it and its requirement's status, and SHALL mark as a gap every row that lacks a feature, a test or code — read from specgate's per-scenario rows (`specgate matrix --json` `rows[]`, or the API's `matrix()`), never from the prose of `docs/specs/traceability.md`, and never as one row per requirement.

> Brief: "One row per scenario: requirement, feature, test, code, status."

#### Scenario: SCN-361 — SCN-020b shows as a gap, on the desktop

- GIVEN sprich open in the desktop app, its requirement REQ-020 with the scenarios SCN-020a and SCN-020b in `features/pagos/REQ-020.feature`, and a test that names SCN-020a only
- WHEN the Reviewer opens Traceability
- THEN the Reviewer sees two rows for REQ-020: SCN-020a with its feature, its test, its code and the status Approved; and SCN-020b with its feature, no test, and marked as a gap

#### Scenario: SCN-362 — The same rows in the browser

- GIVEN the same sprich served by `specgate-studio serve`
- WHEN the Reviewer opens Traceability in the browser
- THEN the Reviewer sees the same rows as on the desktop, SCN-020b marked as a gap

### Requirement: REQ-122 — Filters: gaps, without a test, waiting for an answer

<!-- specgate:trace actor=Reviewer kind=functional -->

The system SHALL filter Traceability's rows by three filters — gaps, without a test, and waiting for an answer — showing how many rows each filter keeps, and SHALL name, on a row waiting for an answer, the open question that blocks its requirement.

> Brief: "Filters: gaps, without a test, waiting for an answer."

#### Scenario: SCN-363 — Without a test, on the desktop

- GIVEN sprich's Traceability open in the desktop app, where SCN-020b is the only scenario no test names
- WHEN the Reviewer chooses the filter without a test
- THEN the Reviewer sees one row, SCN-020b, and the filter says it keeps 1 row

#### Scenario: SCN-364 — Waiting for an answer, in the browser

- GIVEN sprich open in the browser, its REQ-031 blocked by the open question Q2 of draft-pedidos
- WHEN the Reviewer chooses the filter waiting for an answer
- THEN the Reviewer sees REQ-031's rows, each naming Q2, and no row of a requirement that no open question blocks

#### Scenario: SCN-365 — Gaps keep every missing link, in the browser

- GIVEN sprich open in the browser, SCN-020b with no test and SCN-031a with a test and no code
- WHEN the Reviewer chooses the filter gaps
- THEN the Reviewer sees SCN-020b and SCN-031a, each saying what it lacks: a test, and code

### Requirement: REQ-123 — "Fix" opens the scenario and proposes the missing test, written only on confirmation

<!-- specgate:trace actor=Developer kind=business-rule -->

The system SHALL offer "Fix" on a row without a test; pressing it SHALL open the scenario in the editor and propose the missing test as a skeleton the studio writes from the scenario's GIVEN/WHEN/THEN — the file it would write and its content, naming the requirement and the scenario — with no agent and no cost; beside it, "Ask the agent" SHALL have the project's agent complete the skeleton and show the result as a diff with its cost. The system SHALL write nothing until the Developer confirms; when it ends, its notice SHALL name the file written, or say that nothing was written, and the next step.

> Brief: ""Fix" opens the scenario and proposes the missing test; nothing is written without confirmation."

#### Scenario: SCN-366 — "Fix" on SCN-020b, on the desktop

- GIVEN sprich's Traceability open in the desktop app, SCN-020b shown as a gap
- WHEN the Developer presses "Fix" on SCN-020b
- THEN the editor opens `features/pagos/REQ-020.feature` at SCN-020b, the proposal shows the file `test/pagos/REQ-020.test.ts` and a skeleton that names REQ-020 and SCN-020b with one step per GIVEN, WHEN and THEN, no agent has run, and no file of sprich has changed

#### Scenario: SCN-367 — The proposal confirmed, in the browser

- GIVEN the proposed test for SCN-020b shown in the browser
- WHEN the Developer confirms it
- THEN `test/pagos/REQ-020.test.ts` is written, SCN-020b's row no longer says it has no test, and the notice names the file written and the next step `specgate apply REQ-020`

#### Scenario: SCN-368 — The proposal cancelled, on the desktop

- GIVEN the proposed test for SCN-020b shown in the desktop app
- WHEN the Developer cancels it
- THEN no file is written, SCN-020b is still a gap, and the notice says that nothing was written

#### Scenario: SCN-369 — "Ask the agent" completes the skeleton, in the browser

- GIVEN the skeleton proposed for SCN-020b shown in the browser, and the agent `claude` set in sprich's `harness.config.yaml`
- WHEN the Developer presses "Ask the agent"
- THEN the Developer sees the agent's completed test as a diff against the skeleton, with its cost, and `test/pagos/REQ-020.test.ts` is still not written until the Developer confirms
