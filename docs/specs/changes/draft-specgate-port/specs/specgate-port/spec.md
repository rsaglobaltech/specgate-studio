# Delta — specgate-port

## ADDED Requirements

### Requirement: REQ-011 — The core knows specgate only through SpecgatePort

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

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

### Requirement: REQ-012 — The CLI adapter: specgate with --json, parsed

<!-- specgate:trace actor=Developer kind=functional -->

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

### Requirement: REQ-013 — The installed specgate checked at start

<!-- specgate:trace actor=Developer kind=functional -->

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

### Requirement: REQ-014 — The in-process adapter, once specgate publishes its API

<!-- specgate:trace status=Draft actor=Developer kind=functional -->

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

### Requirement: REQ-015 — One contract test suite for every adapter

<!-- specgate:trace actor=Developer kind=functional -->

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

### Requirement: REQ-016 — A command the port does not offer is refused before anything runs

<!-- specgate:trace actor=Developer kind=business-rule -->

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
