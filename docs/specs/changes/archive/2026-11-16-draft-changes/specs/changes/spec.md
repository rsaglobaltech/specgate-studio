# Delta — changes

## ADDED Requirements

### Requirement: REQ-081 — Changes grouped by what they wait for

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL list every open change of the project in the Changes view in three groups — to review, in progress, ready to archive — each change in the group its state puts it in, with how many it holds.

> Brief: "Changes are grouped: to review, in progress, ready to archive."

#### Scenario: SCN-241 — sprich's changes in the desktop app

- GIVEN sprich with the draft `draft-pedidos` not yet approved, the change `add-coupons` with one requirement still to apply, and the change `fix-rounding` with every requirement applied
- WHEN the Developer opens Changes in the desktop app
- THEN they see "To review (1)" with `draft-pedidos`, "In progress (1)" with `add-coupons`, and "Ready to archive (1)" with `fix-rounding`

#### Scenario: SCN-242 — A change moves group in the browser

- GIVEN sprich open in the browser with `add-coupons` under "In progress"
- WHEN its last requirement is applied and the Developer opens Changes again
- THEN `add-coupons` is under "Ready to archive" and no longer under "In progress"

### Requirement: REQ-082 — A draft's requests for change, open or addressed, and its requirements before and after

<!-- specgate:trace status=Implemented actor=Reviewer kind=functional -->

The system SHALL show, in a draft under review, each request for change written to its `review.md` as open or addressed, and, for each requirement a redraft changed, its text before and after the redraft side by side.

> Brief: "A draft shows its requests for change as open or addressed, and each requirement before and after a redraft."

#### Scenario: SCN-243 — Requests on the desktop

- GIVEN `draft-pedidos` with two requests for change in its `review.md`, one addressed by the last redraft and one not
- WHEN the Reviewer opens `draft-pedidos` in Changes in the desktop app
- THEN they see one request marked open and one marked addressed, each with its text and the requirement it is about

#### Scenario: SCN-244 — Before and after in the browser

- GIVEN `draft-pedidos` redrafted after a request about REQ-031
- WHEN the Reviewer opens REQ-031 in that draft in the browser
- THEN they see REQ-031's text before the redraft and after it, side by side, with the changed words marked

### Requirement: REQ-083 — "Draft again with N requested changes" hands the open notes to the agent

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL offer, on a draft with open requests for change, the action "Draft again with N requested changes" — N the number of open requests — which runs `specgate propose --from-brief <module>` with the agent and hands it those open requests, and none that are addressed.

> Brief: ""Draft again with N requested changes" hands the open notes to the agent."

#### Scenario: SCN-245 — Two open requests on the desktop

- GIVEN `draft-pedidos` with two open requests and one addressed request in its `review.md`
- WHEN the Developer clicks "Draft again with 2 requested changes" in the desktop app
- THEN `specgate propose --from-brief pedidos` runs with the agent, its echo shows in the terminal, and the agent's prompt carries the two open requests and not the addressed one

#### Scenario: SCN-246 — No open request in the browser

- GIVEN `draft-pedidos` whose requests are all addressed
- WHEN the Developer opens it in Changes in the browser
- THEN no "Draft again" action is offered, and the draft says it has no open request

### Requirement: REQ-084 — A change from a ticket is reviewed first, opened on its branch, its commit and push said and confirmed

<!-- specgate:trace status=Implemented actor=Developer kind=business-rule -->

The system SHALL, when the Developer opens a change from a ticket, first show the ticket's review — what the change will contain — then say the branch it opens on and whether it will commit and push, and run `specgate propose --from-ticket <KEY>` only once the Developer confirms; on the ticket's branch already, it opens there with `--no-branch`, and with "Don't push yet" chosen it adds `--no-push`.

> Brief: "A change from a ticket is reviewed first, opened on the ticket's branch, and its commit and push are said and confirmed."

#### Scenario: SCN-247 — KAN-13 on its own branch, on the desktop

- GIVEN sprich checked out on `feature/parking/KAN-13`, and the ticket KAN-13 readable from Jira
- WHEN the Developer opens a change from KAN-13 in the desktop app, reviews it, chooses "Don't push yet" and confirms
- THEN before confirming they were told it opens on `feature/parking/KAN-13` and will not push, and the studio runs `specgate propose --from-ticket KAN-13 --no-branch --no-push`

#### Scenario: SCN-248 — Nothing runs before the confirmation, in the browser

- GIVEN the review of KAN-13 shown in the browser
- WHEN the Developer closes it without confirming
- THEN no command ran, no branch was created and nothing was committed or pushed

### Requirement: REQ-085 — Archive runs only after its preview

<!-- specgate:trace status=Implemented actor=Developer kind=business-rule -->

The system SHALL archive a change only after showing its preview — `specgate archive <change> --dry-run`: the specs, matrix rows and feature files it would write — and only when the Developer confirms that preview; a change with a requirement not yet applied is not offered for archive.

> Brief: "Archive runs only after its preview."

#### Scenario: SCN-249 — Archiving fix-rounding on the desktop

- GIVEN `fix-rounding` under "Ready to archive"
- WHEN the Developer clicks Archive in the desktop app, reads the preview and confirms
- THEN `specgate archive fix-rounding --dry-run` ran first and its preview showed, then `specgate archive fix-rounding` ran, and the notice names what it wrote

#### Scenario: SCN-250 — A change still in progress in the browser

- GIVEN `add-coupons` with one requirement still to apply
- WHEN the Developer opens it in Changes in the browser
- THEN no Archive action is offered, and the change says which requirement is still to apply

### Requirement: REQ-086 — Apply runs the gate for one requirement and says why it refuses

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL offer Apply on each requirement still to apply, run `specgate apply <REQ>` for it through the host, and end with the notice the help module defines: the requirement marked Implemented when the gate passes, or, when it refuses, the finding's code, what it means and its fix — never only "failed".

> Brief: "Apply runs the gate for one requirement and, when it refuses, says why and the fix."

#### Scenario: SCN-251 — Apply on REQ-031 refused on the desktop

- GIVEN REQ-031 of `add-coupons` with no test that names it
- WHEN the Developer clicks Apply on REQ-031 in the desktop app
- THEN `specgate apply REQ-031` ran, the notice says it was refused with `apply_no_test`, that nothing was written, and the fix: write a test that names REQ-031

#### Scenario: SCN-252 — Apply on REQ-030 in the browser

- GIVEN REQ-030 of `add-coupons` with a test that names it and a passing gate
- WHEN the Developer clicks Apply on REQ-030 in the browser
- THEN `specgate apply REQ-030` ran, REQ-030 shows Implemented, and the notice names the files it wrote and the next step

