# Delta — specgate-port

## ADDED Requirements

### Requirement: REQ-214 — A change's approval read layer by layer, as specgate 1.0 says it

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL decide whether an open change waits for review from `change show --json`'s `change.approvals` whenever specgate gives it with `required: true` — the change waits while `approved` is false, whatever its `approved:` line says — and from the `approved:` line otherwise; SHALL show in Changes each written layer of such a change with its owner and whether it is approved, waits for its approval, or was edited after it; and SHALL list in Build the requirements of a change that waits as waiting for review, never as ready.

#### Scenario: SCN-961 — Tasks not approved yet, on the desktop

- GIVEN sprich on specgate 1.0 in the desktop app, draft-pedidos with discover and design approved and tasks not, its `approved:` line still dated 2026-11-01
- WHEN the Developer opens Changes, then Build
- THEN the Developer sees draft-pedidos under "to review" with discover · product · approved, design · architect · approved and tasks · developer · waits for its approval, and REQ-030 in Build waiting for review

#### Scenario: SCN-962 — A layer edited after its approval, in the browser

- GIVEN sprich on specgate 1.0 in the browser, draft-pedidos' discover edited after Ana approved it
- WHEN the Developer opens Changes
- THEN the Developer sees discover · product · edited after its approval: approve it again, and the change under "to review"

### Requirement: REQ-215 — The next step as specgate 1.0 names it, the migration first

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL take Home's next step from `status --json`'s `next.command`, and from `nextCommand` when specgate gives no `next`; and SHALL, while `status --json` carries `migrate`, make the next step "Move the project to specgate 1.0" / "Lleva el proyecto a specgate 1.0", saying how many open changes were written for 0.x — or that `harness.config.yaml` still names the lanes under `roles:` — and showing `specgate migrate 1.0`, before any other step.

#### Scenario: SCN-963 — The next command from next, on the desktop

- GIVEN sprich on specgate 1.0 in the desktop app, `status --json` naming `specgate apply REQ-172` under `next`
- WHEN the Developer opens Home
- THEN the Developer sees "Apply REQ-172" as the next step

#### Scenario: SCN-964 — Eleven changes written for 0.x, in the browser

- GIVEN the studio's own repository on specgate 1.0 in the browser, eleven open changes written for 0.x
- WHEN the Developer opens Home
- THEN the Developer sees "Move the project to specgate 1.0", that 11 open changes were written for 0.x, and `specgate migrate 1.0`

### Requirement: REQ-216 — A build specgate refused says its code and its fix

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL, when a build's result carries an error worded `<code>: <message> Fix: <command>` — as specgate 1.0's `harness_not_approved` is — end the build's notice with that code and message and offer that command as its fix, and SHALL keep the result's own word (`skipped`, `fail`) for an error said without a code.

#### Scenario: SCN-965 — REQ-030 skipped, its change not approved, on the desktop

- GIVEN sprich on specgate 1.0 in the desktop app, draft-pedidos waiting for its tasks' approval
- WHEN the Developer builds REQ-030
- THEN the Developer sees the build end with "harness_not_approved: draft-pedidos waits for tasks (developer)." and the fix `specgate change approve draft-pedidos --layer tasks`
