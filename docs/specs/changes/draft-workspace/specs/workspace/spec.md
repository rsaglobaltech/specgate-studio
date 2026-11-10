# Delta — workspace

## ADDED Requirements

### Requirement: REQ-021 — An opened folder is told empty, code, or a specgate project

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL, when a Developer opens a folder, say which of three it is: an empty folder, a folder with code and no specgate project, or a specgate project.

> Brief: "When a Developer opens a folder, the studio says whether it is empty, has code, or is a specgate project."

#### Scenario: SCN-061 — sprich opened on the desktop is a specgate project

- GIVEN the folder `sprich`, which holds `docs/specs/traceability.md`
- WHEN the Developer opens it in the desktop app
- THEN the Developer sees "Specgate project" for sprich, and its Home

#### Scenario: SCN-062 — An empty folder opened in the browser

- GIVEN the folder `nuevo`, which holds nothing but `.git`
- WHEN the Developer opens it in the browser
- THEN the Developer sees "Empty folder", and no specgate command was run for it

### Requirement: REQ-022 — The watcher ignores dependencies, git and build output

<!-- specgate:trace status=Implemented actor=Developer kind=business-rule -->

The system SHALL not watch, list or count files under `node_modules`, `.git` or a build folder of the open project.

> Brief: "The file watcher ignores `node_modules`, `.git` and build folders, and keeps up with 50,000 files."

#### Scenario: SCN-063 — A dependency installed on the desktop changes nothing

- GIVEN sprich open in the desktop app
- WHEN the Developer runs `npm install` in its terminal and it writes under `node_modules`
- THEN the Developer sees no file of `node_modules` in the Explorer and the uncommitted files unchanged

#### Scenario: SCN-064 — A build in the browser changes nothing

- GIVEN sprich open in the browser
- WHEN the Developer runs its build and it writes `apps/web/dist`
- THEN the Developer sees no file of `apps/web/dist` in the Explorer, and no section of the project was read again

### Requirement: REQ-023 — The watcher keeps up with 50,000 files

<!-- specgate:trace status=Implemented actor=Developer kind=non-functional -->

The system SHALL, in a project of 50,000 files outside the ignored folders, report a saved file to the core host within 500 ms of the save.

> Brief: "The file watcher ignores `node_modules`, `.git` and build folders, and keeps up with 50,000 files."

#### Scenario: SCN-065 — A save in a project of 50,000 files, on the desktop

- GIVEN a project of 50,000 files open in the desktop app
- WHEN the Developer saves `docs/specs/changes/draft-pedidos/questions.md`
- THEN the Developer sees Questions read again within 500 ms of the save

#### Scenario: SCN-066 — The same in the browser

- GIVEN a project of 50,000 files open in the browser
- WHEN the Developer saves `spec.md` from the editor
- THEN the Developer sees the save in the uncommitted files within 500 ms

### Requirement: REQ-024 — The branch, and the team and ticket it names

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL show the open project's git branch and, when the branch is named `feature/<team>/<KEY>`, the team and the ticket key it names; a branch of any other form SHALL show the branch alone.

> Brief: "The git state shows the branch, the ticket and team a branch names (`feature/<team>/<KEY>`), and the uncommitted files grouped by folder."

#### Scenario: SCN-067 — A ticket branch on the desktop

- GIVEN sprich on the branch `feature/pagos/SPR-42`
- WHEN the Developer opens sprich in the desktop app
- THEN the Developer sees the branch `feature/pagos/SPR-42`, the team `pagos` and the ticket `SPR-42`

#### Scenario: SCN-068 — Another branch in the browser

- GIVEN sprich on the branch `feat/mvp-fase-1`
- WHEN the Developer opens sprich in the browser
- THEN the Developer sees the branch `feat/mvp-fase-1`, and no team and no ticket

### Requirement: REQ-025 — The uncommitted files, grouped by folder

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL show how many files of the open project are uncommitted and group them by folder, with the files of the specification in a group of their own and a count per group.

> Brief: "The git state shows the branch, the ticket and team a branch names (`feature/<team>/<KEY>`), and the uncommitted files grouped by folder."

#### Scenario: SCN-069 — sprich's 325 uncommitted files on the desktop

- GIVEN sprich with 325 uncommitted files, 129 under `packages/core`, 96 under `apps/web` and 84 of the specification
- WHEN the Developer opens the uncommitted files in the desktop app
- THEN the Developer sees 325 files, with the groups `packages/core` 129, `apps/web` 96 and the specification 84

#### Scenario: SCN-070 — The same groups in the browser

- GIVEN sprich with 325 uncommitted files, 129 under `packages/core`, 96 under `apps/web` and 84 of the specification
- WHEN the Developer opens the uncommitted files in the browser
- THEN the Developer sees the same 325 files and the same three groups and counts

### Requirement: REQ-026 — The last 10 projects of each Developer

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL remember the last 10 projects each Developer opened, the most recent first, and open one of them when the Developer picks it; several projects SHALL be open at once, one window per project on the desktop and one tab in the browser, each with its own core host, and picking a recent project that is already open SHALL bring its window forward instead of opening it again.

> Brief: "The studio remembers each Developer's last 10 projects."

#### Scenario: SCN-071 — The recent projects on the desktop

- GIVEN a Developer who opened 10 projects, `sprich` the last of them
- WHEN the Developer opens the folder `billing` in the desktop app
- THEN the Developer sees 10 recent projects, `billing` first and `sprich` second, and the one opened earliest no longer listed

#### Scenario: SCN-072 — A recent project reopened in the browser

- GIVEN `sprich` among the Developer's 10 recent projects
- WHEN the Developer picks `sprich` from the recent projects in the browser
- THEN the Developer sees sprich open, and `sprich` first in the recent projects

#### Scenario: SCN-073 — A recent project already open, on the desktop

- GIVEN `sprich` and `billing` open in two windows of the desktop app, the `billing` window in front
- WHEN the Developer picks `sprich` from the recent projects in the `billing` window
- THEN the `sprich` window comes to the front, and no second window or core host for sprich is started
