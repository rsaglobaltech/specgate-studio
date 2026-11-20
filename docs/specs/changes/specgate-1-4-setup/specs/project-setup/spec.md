# Delta — project-setup

## ADDED Requirements

### Requirement: REQ-228 — An undecided stack is something to settle, in the readiness list and on Home

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL add Stack and Testing to the readiness list after setup, each set with the value `AGENTS.md` states or, when specgate answers `TBD` for `stack` or `testing` in `config list --json`, shown as to decide with a field whose save runs `specgate config set stack "<value>"` or `specgate config set testing "<value>"`; and SHALL, while either is `TBD`, make Home's next step "Decide the stack" / "Decide el stack", before Build, saying that the agent stops until it is decided.

> Issue #40: "Setup and Home show an undecided stack as something to settle, with a field that runs `config set stack` / `testing`."

#### Scenario: SCN-1002 — An empty folder adopted, on the desktop

- GIVEN `~/projects/notes`, a folder with no build manifest, just adopted in the desktop app, its `AGENTS.md` saying `Stack: TBD` and `Testing: TBD`
- WHEN the Developer looks at the readiness list
- THEN Stack and Testing show as to decide, each with a field, and Home's next step is "Decide the stack"

#### Scenario: SCN-1003 — The stack decided from the readiness list, in the browser

- GIVEN `~/projects/notes` open in the browser, its Stack to decide
- WHEN the Developer writes `TypeScript, Node 22` in Stack's field and saves
- THEN `specgate config set stack "TypeScript, Node 22"` runs, the readiness list shows Stack set to `TypeScript, Node 22`, and `AGENTS.md` says it

#### Scenario: SCN-1004 — A stack adoption detected, in the browser

- GIVEN `~/projects/shop` just adopted in the browser, its `AGENTS.md` saying `Stack: Node.js` and `Testing: npm test`
- WHEN the Developer looks at the readiness list
- THEN Stack shows set to `Node.js`, Testing set to `npm test`, and Home's next step is not "Decide the stack"

### Requirement: REQ-229 — Stack and testing in Settings

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL show `stack` and `testing` under Preferences in Settings, each with a name and a description in English and Spanish, the file specgate gives (`AGENTS.md`) and its value from `config list --json`, saved only through `specgate config set`.

> Issue #40: "the two keys get a section and labels in Settings."

#### Scenario: SCN-1005 — The stack read in Settings, on the desktop

- GIVEN sprich open in the desktop app, its `AGENTS.md` saying `Stack: TypeScript 5`
- WHEN the Developer opens Settings, then Preferences
- THEN the Developer sees Stack with `TypeScript 5`, kept in `AGENTS.md`, beside `specgate config set stack`

### Requirement: REQ-230 — Home does not count the baseline of adopted code as work to do

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL take as the adoption baseline the requirement tagged in `features/adoption/baseline.feature` whose title is "Preserve existing behaviour" — REQ-001 since specgate 1.4, REQ-000 before — and SHALL leave it out of Home's requirements and to-do counters while it is pending, saying under the counters that the baseline of the existing code is closed by a test that names it; a project adopted with no code, whose baseline is "Build and test the project", SHALL count it as any other requirement.

> Issue #40: "After adoption of a project with code, Home does not count REQ-001 as work to do."

#### Scenario: SCN-1006 — shop just adopted, on the desktop

- GIVEN `~/projects/shop` just adopted in the desktop app with specgate 1.4, `specgate status --json` listing only REQ-001 "Preserve existing behaviour", pending
- WHEN the Developer opens Home
- THEN the counters show 0 requirements and 0 to do, and below them that the baseline of the existing code is closed by a test that names REQ-001

#### Scenario: SCN-1007 — An empty folder's baseline counts, in the browser

- GIVEN `~/projects/notes` adopted in the browser with no code, `specgate status --json` listing REQ-001 "Build and test the project", pending
- WHEN the Developer opens Home
- THEN the counters show 1 requirement and 1 to do
