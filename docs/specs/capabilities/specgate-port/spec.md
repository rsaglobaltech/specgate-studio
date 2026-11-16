# Specgate Port

## Requirements

### Requirement: REQ-011 — The core knows specgate only through SpecgatePort

The system SHALL reach specgate from the core only through the `SpecgatePort` interface, and the architecture check SHALL fail when `packages/core` imports the specgate package.

> Brief: "The core depends on a `SpecgatePort` interface only, never on the specgate package."

#### Scenario: SCN-031 — Sprich opened on the desktop, through the port

- GIVEN the desktop app built from a tree where `packages/core` does not import `@rsaglobaltech/specgate`
- WHEN the Developer opens sprich
- THEN the Developer sees sprich's Home, read through `SpecgatePort`, and `npm run arch` passes

#### Scenario: SCN-032 — A core that imports specgate does not pass the gate

- GIVEN a change that makes `packages/core/src/application/ProjectState.ts` import `@rsaglobaltech/specgate`
- WHEN the Developer opens the Gate panel in the browser and presses Check
- THEN the Developer sees the Architecture stage fail, naming the rule `core-imports-nothing-outside-core`

<!-- specgate:trace actor=Developer feature=features/specgate-port/REQ-011.feature kind=functional status=Implemented -->

### Requirement: REQ-012 — The CLI adapter: specgate with --json, parsed

The system SHALL provide a `SpecgatePort` adapter that runs the specgate CLI with `--json`, parses its standard output into typed data, and returns specgate's findings with their code and fix instead of its prose.

> Brief: "The first adapter runs the specgate CLI with `--json` and parses its output."

#### Scenario: SCN-033 — Questions on the desktop, from `specgate questions --json`

- GIVEN sprich open in the desktop app with the open question Q2 of draft-pedidos
- WHEN the Developer opens Questions
- THEN the Developer sees Q2 with the requirements it blocks, parsed from `specgate questions --json`

#### Scenario: SCN-034 — A refused apply in the browser, with its finding

- GIVEN sprich open in the browser and REQ-007 with no test that names it
- WHEN the Developer taps Deliver on REQ-007
- THEN the Developer sees `apply REQ-007` refused with the finding `apply_no_test` and its fix, from `specgate apply REQ-007 --json`

<!-- specgate:trace actor=Developer feature=features/specgate-port/REQ-012.feature kind=functional status=Implemented -->

### Requirement: REQ-013 — The installed specgate checked at start

The system SHALL, when the host starts, read the installed specgate's version and, when it is older than the version the studio needs, say both versions and the command that updates it, and run no other specgate command.

> Brief: "When the host starts, it checks the installed specgate version against the one it needs."

#### Scenario: SCN-035 — 0.29.1 installed, 0.30.0 needed, on the desktop

- GIVEN specgate 0.29.1 installed and a studio that needs 0.30.0
- WHEN the Developer opens sprich in the desktop app
- THEN the Developer sees "specgate 0.29.1 is installed; the studio needs 0.30.0" and `npm i -g @rsaglobaltech/specgate@0.30.0`, and no section is read

#### Scenario: SCN-036 — The same in the browser

- GIVEN specgate 0.29.1 installed and `specgate-studio serve` for sprich, which needs 0.30.0
- WHEN the Developer opens the studio's address in the browser
- THEN the Developer sees both versions and the update command, and no section is read

<!-- specgate:trace actor=Developer feature=features/specgate-port/REQ-013.feature kind=functional status=Implemented -->

### Requirement: REQ-014 — The in-process adapter, once specgate publishes its API

The system SHALL provide a second `SpecgatePort` adapter that calls specgate's public API `@rsaglobaltech/specgate/api` in process — `status`, `questions` and `matrix` first — without starting a process, and SHALL use it instead of the CLI adapter where specgate offers it, the CLI adapter covering every other command.

> Brief: "Once specgate publishes a public API, a second adapter calls it in process."

#### Scenario: SCN-037 — Home on the desktop without a specgate process

- GIVEN a specgate that publishes its in-process API, and sprich open in the desktop app
- WHEN the Developer opens Home
- THEN the Developer sees Home's data and no specgate process was started to read it

#### Scenario: SCN-038 — The CLI adapter where the API lacks a command, in the browser

- GIVEN the in-process API offers `status` but not `report`
- WHEN the Developer opens Report in the browser
- THEN the Developer sees the report, read by the CLI adapter with `specgate report --json`

<!-- specgate:trace actor=Developer feature=features/specgate-port/REQ-014.feature kind=functional status=Implemented -->

### Requirement: REQ-015 — One contract test suite for every adapter

The system SHALL run the same contract tests of `SpecgatePort` against the CLI adapter, the in-process adapter and the in-memory fake, and SHALL let an adapter be used only when it passes them.

> Brief: "Both adapters pass the same contract tests."

#### Scenario: SCN-039 — The same Questions from either adapter, on the desktop

- GIVEN sprich, read once through the CLI adapter and once through the fake loaded with the CLI adapter's answers
- WHEN the Developer opens Questions with each
- THEN the Developer sees the same questions, in the same order, from both

#### Scenario: SCN-040 — An adapter that breaks the contract is not used, in the browser

- GIVEN an adapter whose `questions` returns a question without the requirements it blocks
- WHEN the Developer opens Questions in the browser
- THEN the contract test `questions lists what each question blocks` fails for that adapter and the studio does not ship with it

<!-- specgate:trace actor=Developer feature=features/specgate-port/REQ-015.feature kind=functional status=Implemented -->

### Requirement: REQ-016 — A command the port does not offer is refused before anything runs

The system SHALL refuse, before starting any process, a command the port does not offer, with the code `command_unknown` and the name the UI asked for.

> Brief: "When the UI asks for a command the port does not offer, it is refused before anything runs."

#### Scenario: SCN-041 — `init --force` asked from the desktop UI

- GIVEN sprich open in the desktop app
- WHEN the Developer's UI asks the host to run `init --force`
- THEN the Developer sees it refused with `command_unknown` naming `init`, and no process was started

#### Scenario: SCN-042 — `rm -rf .` asked from a browser tab

- GIVEN sprich open in the browser
- WHEN the Developer's tab asks the host to run `rm -rf .`
- THEN the Developer sees it refused with `command_unknown` naming `rm -rf .`, and no process was started

<!-- specgate:trace actor=Developer feature=features/specgate-port/REQ-016.feature kind=business-rule status=Implemented -->

### Requirement: REQ-214 — A change's approval read layer by layer, as specgate 1.0 says it

The system SHALL decide whether an open change waits for review from `change show --json`'s `change.approvals` whenever specgate gives it with `required: true` — the change waits while `approved` is false, whatever its `approved:` line says — and from the `approved:` line otherwise; SHALL show in Changes each written layer of such a change with its owner and whether it is approved, waits for its approval, or was edited after it; and SHALL list in Build the requirements of a change that waits as waiting for review, never as ready.

#### Scenario: SCN-961 — Tasks not approved yet, on the desktop

- GIVEN sprich on specgate 1.0 in the desktop app, draft-pedidos with discover and design approved and tasks not, its `approved:` line still dated 2026-11-01
- WHEN the Developer opens Changes, then Build
- THEN the Developer sees draft-pedidos under "to review" with discover · product · approved, design · architect · approved and tasks · developer · waits for its approval, and REQ-030 in Build waiting for review

#### Scenario: SCN-962 — A layer edited after its approval, in the browser

- GIVEN sprich on specgate 1.0 in the browser, draft-pedidos' discover edited after Ana approved it
- WHEN the Developer opens Changes
- THEN the Developer sees discover · product · edited after its approval: approve it again, and the change under "to review"

<!-- specgate:trace actor=Developer feature=features/specgate-port/REQ-214.feature kind=functional status=Implemented -->

### Requirement: REQ-215 — The next step as specgate 1.0 names it, the migration first

The system SHALL take Home's next step from `status --json`'s `next.command`, and from `nextCommand` when specgate gives no `next`; and SHALL, while `status --json` carries `migrate`, make the next step "Move the project to specgate 1.0" / "Lleva el proyecto a specgate 1.0", saying how many open changes were written for 0.x — or that `harness.config.yaml` still names the lanes under `roles:` — and showing `specgate migrate 1.0`, before any other step.

#### Scenario: SCN-963 — The next command from next, on the desktop

- GIVEN sprich on specgate 1.0 in the desktop app, `status --json` naming `specgate apply REQ-172` under `next`
- WHEN the Developer opens Home
- THEN the Developer sees "Apply REQ-172" as the next step

#### Scenario: SCN-964 — Eleven changes written for 0.x, in the browser

- GIVEN the studio's own repository on specgate 1.0 in the browser, eleven open changes written for 0.x
- WHEN the Developer opens Home
- THEN the Developer sees "Move the project to specgate 1.0", that 11 open changes were written for 0.x, and `specgate migrate 1.0`

<!-- specgate:trace actor=Developer feature=features/specgate-port/REQ-215.feature kind=functional status=Implemented -->

### Requirement: REQ-216 — A build specgate refused says its code and its fix

The system SHALL, when a build's result carries an error worded `<code>: <message> Fix: <command>` — as specgate 1.0's `harness_not_approved` is — end the build's notice with that code and message and offer that command as its fix, and SHALL keep the result's own word (`skipped`, `fail`) for an error said without a code.

#### Scenario: SCN-965 — REQ-030 skipped, its change not approved, on the desktop

- GIVEN sprich on specgate 1.0 in the desktop app, draft-pedidos waiting for its tasks' approval
- WHEN the Developer builds REQ-030
- THEN the Developer sees the build end with "harness_not_approved: draft-pedidos waits for tasks (developer)." and the fix `specgate change approve draft-pedidos --layer tasks`

<!-- specgate:trace actor=Developer feature=features/specgate-port/REQ-216.feature kind=functional status=Implemented -->
