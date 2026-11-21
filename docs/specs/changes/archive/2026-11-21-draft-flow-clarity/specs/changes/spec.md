# Delta — changes

## ADDED Requirements

### Requirement: REQ-242 — A draft that cannot be approved says why, and the agent can fix it

<!-- specgate:trace status=Implemented actor=Reviewer kind=functional -->

The system SHALL show, on a change specgate would not approve yet — the blockers `change show --json` gives (specgate REQ-619) — "Cannot be approved yet (N)" with each blocker's message and fix, its Approve buttons disabled, and "Fix with the agent", which runs the project's agent on the change's draft (`specgate propose --from-brief <module> --agent <agent>`) as any command, told in the terminal; with a specgate that does not give blockers, the card SHALL show as before.

> A draft with six findings was listed to review with Approve; pressing it was the first time the Reviewer learned it could not be approved.

#### Scenario: SCN-1020 — Two blockers shown, in the browser

- GIVEN sprich in the browser, draft-pedidos waiting for its discover layer, and specgate saying two blockers for it, each with its fix
- WHEN the Reviewer opens Changes
- THEN draft-pedidos shows "Cannot be approved yet (2)" with both messages and fixes, its Approve button is disabled, and "Fix with the agent" is offered

#### Scenario: SCN-1021 — Fix with the agent, on the desktop

- GIVEN sprich on the desktop, draft-pedidos with one blocker, an agent set
- WHEN the Reviewer presses "Fix with the agent"
- THEN `specgate propose --from-brief pedidos --agent claude` runs, shown in the terminal and on the card while it runs

### Requirement: REQ-243 — Each requirement offers its next step, and an action under way shows on its card

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL offer, for each requirement of a change in progress, the step specgate status says it needs: "Build" — which opens Build — when it needs a test, code or both; "Answer" — which opens Questions — when it waits for an answer; and "Apply" only when its test and code are there and it waits for its status; and SHALL show, on the change's card while one of its actions runs (approve, apply, archive, fix), the action and its seconds.

> Apply was offered for a requirement with no test; specgate refused it with `apply_no_test`.

#### Scenario: SCN-1022 — Build for a requirement with no test, Apply for one whose test is there, in the browser

- GIVEN sprich in the browser, draft-pedidos approved, REQ-030 needing a test and code and REQ-031 with its test and code waiting for its status
- WHEN the Developer opens Changes
- THEN REQ-030 offers "Build" and no Apply, REQ-031 offers "Apply"; "Build" opens the Build view

#### Scenario: SCN-1023 — An approval under way, on the desktop

- GIVEN sprich on the desktop, draft-pedidos waiting for its discover layer, and specgate slow to approve it
- WHEN the Reviewer presses its Approve
- THEN the card shows the approval under way with its seconds until specgate answers
