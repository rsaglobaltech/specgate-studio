# Delta — workspace

## ADDED Requirements

### Requirement: REQ-218 — A specgate workspace opens as its repositories

<!-- specgate:trace status=Implemented actor=Developer kind=functional feature=features/workspace/REQ-218.feature -->

The system SHALL open a folder holding `specgate.workspace.yaml` at its top and no `docs/specs/traceability.md` as a specgate workspace, offering no adoption for it; SHALL show on its Home the workspace's name and, for each repository `specgate workspace status --json` names, its name, its role, its requirements done of its total, its branch and its last gate; SHALL open a repository that is there, on "Open <repo>" / "Abrir <repo>", in a host of its own as a recent project opens; and SHALL say of a repository that is not there where it is expected and, when the workspace gives one, the `git clone` command that puts it there.

#### Scenario: SCN-981 — truck's workspace, on the desktop

- GIVEN truck-workspace made by `specgate workspace init --name truck` beside truck-fleet and truck-web, in the desktop app
- WHEN the Developer opens truck-workspace
- THEN the Developer sees truck with fleet · service and web · web, each with its requirements done of its total, and no offer to adopt the folder

#### Scenario: SCN-982 — Open fleet, in the browser

- GIVEN truck-workspace open in the browser
- WHEN the Developer presses "Open fleet"
- THEN the Developer sees truck-fleet open as a specgate project in a host of its own
