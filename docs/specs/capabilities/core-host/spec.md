# Core Host

## Requirements

### Requirement: REQ-001 — One core host per open project, over typed JSON-RPC

The system SHALL start one core host for the project a Developer opens, and the UI SHALL talk to it only through typed JSON-RPC requests and notifications over a WebSocket on 127.0.0.1 — the same transport in the desktop app, where the host runs as a sidecar, and in the browser.

> Brief: "When a Developer opens a project, one core host starts for it, and the UI talks to it over a typed JSON-RPC transport."

#### Scenario: SCN-001 — The desktop app opens sprich

- GIVEN the desktop app with no project open
- WHEN the Developer opens the folder `~/mvp/sprich-platform/sprich`
- THEN one core host runs for sprich as a sidecar listening on a WebSocket on 127.0.0.1, and Home shows sprich's state, received as the answer to the JSON-RPC request `project.open`

#### Scenario: SCN-002 — Two browser tabs share one host

- GIVEN `specgate-studio serve` running for `~/mvp/sprich-platform/sprich` on `http://127.0.0.1:4180`
- WHEN the Developer opens that address in a second browser tab
- THEN both tabs show sprich from the same core host, and still exactly one core host process runs for sprich

<!-- specgate:trace actor=Developer feature=features/core-host/REQ-001.feature kind=functional status=Implemented -->

### Requirement: REQ-002 — The project's state kept in memory after the first read

The system SHALL read the project's requirements, changes, questions, matrix and gate once, keep them in memory, and answer later requests from memory without running specgate again.

> Brief: "When the project is first read, its state (requirements, changes, questions, matrix, gate) is kept in memory."

#### Scenario: SCN-003 — Home again, from memory, on the desktop

- GIVEN the desktop app has read sprich once, and that first `status` took 1.9 s
- WHEN the Developer opens Home again
- THEN Home's data comes back in 20 ms and no specgate process is started

#### Scenario: SCN-004 — A reload in the browser does not read the project again

- GIVEN sprich read once by `specgate-studio serve`
- WHEN the Developer reloads the browser tab
- THEN the page shows sprich's state again and the host starts no specgate process

<!-- specgate:trace actor=Developer feature=features/core-host/REQ-002.feature kind=functional status=Implemented -->

### Requirement: REQ-003 — A changed file refreshes only what it feeds

The system SHALL, when a file of the specification changes, read again only the parts of the state that file feeds, and tell the UI which parts changed.

> Brief: "When a file of the specification changes, only the parts of the state that file feeds are read again."

#### Scenario: SCN-005 — questions.md saved, on the desktop

- GIVEN sprich open in the desktop app, all of its state read
- WHEN the Developer saves `docs/specs/changes/draft-pedidos/questions.md`
- THEN only Questions and the matrix are read again, and the UI is told that `questions` and `matrix` changed; Changes, Home and Report are not read again

#### Scenario: SCN-006 — A feature file saved, in the browser

- GIVEN sprich open in the browser, all of its state read
- WHEN the Developer saves `features/auth/REQ-010.feature` in another editor
- THEN only the matrix is read again, and the UI is told that `matrix` changed

<!-- specgate:trace actor=Developer feature=features/core-host/REQ-003.feature kind=functional status=Implemented -->

### Requirement: REQ-004 — A section's data in under 50 ms after the first read

The system SHALL answer a request for a section's data in under 50 ms once the project has been read the first time.

> Brief: "After the first read, a section's data is answered in under 50 ms."

#### Scenario: SCN-007 — Changes on the desktop

- GIVEN sprich read once in the desktop app
- WHEN the Developer opens Changes
- THEN the Developer sees the list of changes in under 50 ms, answered by `section.get` for `changes`

#### Scenario: SCN-008 — Questions in the browser

- GIVEN sprich read once by `specgate-studio serve`
- WHEN the Developer opens Questions in the browser
- THEN the Developer sees the open questions in under 50 ms, answered by `section.get` for `questions`

<!-- specgate:trace actor=Developer feature=features/core-host/REQ-004.feature kind=non-functional status=Implemented -->

### Requirement: REQ-005 — A command followed as events

The system SHALL report every command the host runs to the UI as events: `started` with the command, `output` with each chunk as it is written, and `ended` with the exit code.

> Brief: "When the host runs a command, the UI can follow it as events: started, output, ended with its exit code."

#### Scenario: SCN-009 — Check on the desktop

- GIVEN sprich open in the desktop app
- WHEN the Developer presses Check
- THEN the UI receives `started` with `specgate check`, `output` with each stage as specgate prints it, and `ended` with exit code 0

#### Scenario: SCN-010 — A refused apply in the browser

- GIVEN sprich open in the browser, REQ-007 with no test that names it
- WHEN the Developer delivers REQ-007
- THEN the UI receives `started` with `specgate apply REQ-007`, its output, and `ended` with exit code 1

<!-- specgate:trace actor=Developer feature=features/core-host/REQ-005.feature kind=functional status=Implemented -->

### Requirement: REQ-006 — One write command at a time

The system SHALL refuse a write command while another write command runs, and the refusal SHALL name the command that runs.

> Brief: "While a write command runs, a second one is refused, naming the one that runs."

#### Scenario: SCN-011 — Archive while apply runs, on the desktop

- GIVEN `specgate apply REQ-007` running from the desktop app
- WHEN the Developer taps Archive on `add-coupons`
- THEN the Developer sees it refused with `write_busy`, the message naming `specgate apply REQ-007`, and nothing is archived

#### Scenario: SCN-012 — A second tab tries to write, in the browser

- GIVEN `specgate apply REQ-007` running, started from one browser tab
- WHEN the Developer taps Save on a preference in a second tab
- THEN the Developer sees it refused with `write_busy` naming `specgate apply REQ-007`, and the preference is not written

<!-- specgate:trace actor=Developer feature=features/core-host/REQ-006.feature kind=business-rule status=Implemented -->

### Requirement: REQ-007 — Arguments as an array, never a shell

The system SHALL pass every argument of a command it runs as one element of an array, and SHALL never start a shell to run it.

> Brief: "The host passes arguments as an array and never runs a shell."

#### Scenario: SCN-013 — A change id with shell characters, on the desktop

- GIVEN sprich open in the desktop app
- WHEN the Developer asks to validate the change `add-coupons; rm -rf .`
- THEN specgate receives `add-coupons; rm -rf .` as one argument, no shell runs, and no file of sprich is removed

#### Scenario: SCN-014 — A project path with a space, in the browser on Windows

- GIVEN `specgate-studio serve` on Windows for `C:\Users\Juan Perez\shop`
- WHEN the Developer presses Check
- THEN specgate receives `C:\Users\Juan Perez\shop` as one argument — the folder `specgate check [dir]` takes — and the gate runs in that folder

<!-- specgate:trace actor=Developer feature=features/core-host/REQ-007.feature kind=functional status=Implemented -->
