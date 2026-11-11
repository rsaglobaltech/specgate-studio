# Delta — report

## ADDED Requirements

### Requirement: REQ-131 — Built of the total, scenarios proven, coverage, mutation score, cost and time

<!-- specgate:trace status="Needs Clarification" actor=Reviewer kind=functional -->

The system SHALL show in Report, for the whole project and for each module, the requirements built of the total, the scenarios proven of the total, the coverage, the mutation score, the cost and the time spent building — each read from specgate's JSON, and each one specgate has not measured shown as not measured with the command that measures it, never as 0.

> Brief: "Built of the total, scenarios proven, coverage, mutation score, cost and time."

#### Scenario: SCN-391 — pagos is 2 of 6, on the desktop

- GIVEN sprich open in the desktop app, its module pagos with 6 requirements of which 2 are Implemented, and the quality checks measured its coverage at 74 %
- WHEN the Reviewer opens Report and chooses pagos
- THEN the Reviewer sees pagos built 2 of 6, the scenarios proven of its total, coverage 74 %, its mutation score, its cost and its time

#### Scenario: SCN-392 — No mutation score yet, in the browser

- GIVEN sprich open in the browser, no quality check that measures mutation configured
- WHEN the Reviewer opens Report
- THEN the Reviewer sees the mutation score as not measured, with the command that sets the checks up, `specgate quality init --level strict`, and no 0 %

### Requirement: REQ-132 — The gate by stage, with the fix of what fails

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL show in Report the last gate run on the project stage by stage — specification, architecture, tests and each quality check — each passed, failed, not configured or not run, and for a stage that failed its finding code and specgate's fix; with no gate run yet, it SHALL say so and name `specgate check`.

> Brief: "The gate by stage, with the fix of what fails."

#### Scenario: SCN-393 — The tests stage failed, on the desktop

- GIVEN sprich open in the desktop app, its last gate passed the specification, has no architecture check, and failed at the tests stage with `check_tests_failed`
- WHEN the Developer opens Report
- THEN the Developer sees specification passed, architecture not configured, tests failed with `check_tests_failed` and the fix "Make `npm test` pass, then run `specgate check` again.", and the quality checks not run

#### Scenario: SCN-394 — No gate run yet, in the browser

- GIVEN sprich just opened in the browser, no gate run since it was opened
- WHEN the Developer opens Report
- THEN the Developer sees that no gate has run yet, and the command `specgate check` beside a Check button

### Requirement: REQ-133 — Download as one HTML page; print to PDF

<!-- specgate:trace actor=Reviewer kind=functional -->

The system SHALL download the report as one self-contained HTML page — its styles inside it, no script and no request to any address — and SHALL print it with a print layout through the system's print dialog, from which it can be saved as PDF; the download's notice SHALL name the file written.

> Brief: "Download as one HTML page; print to PDF."

#### Scenario: SCN-395 — Download on the desktop

- GIVEN sprich's Report open in the desktop app, on pagos
- WHEN the Reviewer presses Download and chooses the folder Downloads
- THEN one file `sprich-report-pagos.html` is written there, it opens offline showing pagos built 2 of 6 and coverage 74 %, and the notice names that file

#### Scenario: SCN-396 — Print to PDF in the browser

- GIVEN sprich's Report open in the browser
- WHEN the Reviewer presses Print
- THEN the browser's print dialog opens on the report alone, without the activity bar, the panels or the status bar, and nothing is written by the studio
