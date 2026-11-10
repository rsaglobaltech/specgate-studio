# Delta — project-setup

## ADDED Requirements

### Requirement: REQ-111 — An empty folder: five questions, then `specgate init`

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL, for a folder with no files, ask the Developer five questions — the project's name, what it is, its stack, the agent that builds it and its architecture — show the `specgate init` command the answers make, and, once the Developer confirms, create the project with `specgate init` in that folder itself, not in a folder inside it.

> Brief: "An empty folder offers five questions and creates the project with `specgate init`."

#### Scenario: SCN-331 — "academia" created in the desktop app

- GIVEN the desktop app opened on the empty folder `~/projects/academia`
- WHEN the Developer answers "academia", a web app, Node.js and React, Claude Code and the minimal architecture, and confirms
- THEN the Developer sees `specgate init` run with those answers in its terminal, and `~/projects/academia` holds `spec.md` and `docs/specs/traceability.md`, with no `academia` folder inside it

#### Scenario: SCN-332 — The command shown before anything is written, in the browser

- GIVEN `specgate-studio serve` on the empty folder `~/projects/academia`, open in the browser
- WHEN the Developer answers the five questions as "academia", a web app, Node.js and React, Claude Code and minimal
- THEN the Developer sees the `specgate init` command those answers make and a Create button, and the folder is still empty until they press it

### Requirement: REQ-112 — A folder with code: adopted in place after a preview

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL, for a folder with code that is not a specgate project, first run `specgate adopt --dry-run` and show every file adoption would write, and only when the Developer confirms run `specgate adopt` in that folder — writing no file that already exists and changing no line of the code.

> Brief: "A folder with code is adopted in place with `specgate adopt`, after showing what it writes."

#### Scenario: SCN-333 — The preview of shop's adoption on the desktop

- GIVEN the desktop app opened on `~/projects/shop`, a Node.js project with code and no specgate files
- WHEN the Developer opens Adopt
- THEN the Developer sees the files `specgate adopt --dry-run` lists — `spec.md`, `AGENTS.md`, `features/adoption/baseline.feature`, `docs/specs/traceability.md` — and no file of shop has been written

#### Scenario: SCN-334 — shop adopted in the browser, its code untouched

- GIVEN shop open in the browser, its adoption previewed
- WHEN the Developer confirms the adoption
- THEN `specgate adopt` runs in `~/projects/shop`, the files of the preview exist, and every file shop had before is byte for byte the same

### Requirement: REQ-113 — The preview names the settings adoption saves

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL show, in the preview of an adoption, beside the files, the settings it saves in `harness.config.yaml` — the test command it detected and the agent whose CLI it found — so nothing is saved that the Developer did not see before confirming.

> Brief: "A folder with code is adopted in place with `specgate adopt`, after showing what it writes."

#### Scenario: SCN-335 — shop's test command and agent in the desktop preview

- GIVEN the desktop app on `~/projects/shop`, whose `package.json` has a `test` script, on a machine with Claude Code installed
- WHEN the Developer opens Adopt
- THEN the preview shows `harness.config.yaml` with `test_cmd: npm test` and the Claude Code agent, beside the files

#### Scenario: SCN-336 — A project with no test yet, in the browser preview

- GIVEN `~/projects/shop` with code and no test file nor `test` script, open in the browser
- WHEN the Developer opens Adopt
- THEN the preview says no test command will be saved because no test was found yet, and how to set one later

### Requirement: REQ-114 — After setup, what is ready and what is not

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL show, once a project is created or adopted, a readiness list — Tests, Agent, Architecture, CI gate — each either set, with its value, or with a button that sets it by running the specgate command, so the Developer finishes the setup in the studio without a terminal or an agent doing it for them.

> Brief: "A folder with code is adopted in place with `specgate adopt`, after showing what it writes."

#### Scenario: SCN-337 — shop ready on the desktop, the architecture check left to set

- GIVEN `~/projects/shop` just adopted in the desktop app, its tests and agent saved
- WHEN the Developer looks at the readiness list
- THEN the Developer sees Tests set to `npm test`, Agent set to Claude Code, CI gate set to `.github/workflows/spec-gate.yml`, and Architecture not set with a button that runs `specgate config set arch_cmd` with the command they type

#### Scenario: SCN-338 — The agent set from the readiness list in the browser

- GIVEN `~/projects/shop` adopted in the browser on a machine where Claude Code was not found, its Agent not set
- WHEN the Developer presses the Agent's button and chooses Claude Code
- THEN `specgate agents init --tool claude` runs, and the readiness list shows Agent set to Claude Code

### Requirement: REQ-115 — The areas adoption found are a map, not requirements

<!-- specgate:trace actor=Developer kind=business-rule -->

The system SHALL show the areas adoption wrote to `docs/specs/adoption.md`, each with its folder and its tests, add none of them to the requirements, and name the next step "Specify a behaviour you rely on"; for code organised by kind of code — components, hooks, utils — it SHALL show no area and say why.

> Brief: "A folder with code is adopted in place with `specgate adopt`, after showing what it writes."

#### Scenario: SCN-339 — shop's areas on the desktop

- GIVEN `~/projects/shop`, with code under `src/billing`, `src/invoices` and `src/utils`, just adopted in the desktop app
- WHEN the Developer opens Home
- THEN the Developer sees the areas Billing and Invoices with their folders, not Utils, the requirements still REQ-001 alone, and the next step "Specify a behaviour you rely on"

#### Scenario: SCN-340 — A React app organised by kind, in the browser

- GIVEN a project with code under `src/components`, `src/hooks` and `src/utils`, just adopted in the browser
- WHEN the Developer opens Home
- THEN the Developer sees no area and that the code is organised by kind, not by area, and the next step "Specify a behaviour you rely on"

### Requirement: REQ-116 — Home leads to the setup the folder needs

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL, on Home of a folder that is not a specgate project, name the next step "Create the project" when the folder is empty and "Adopt this folder" when it holds code, each opening its setup, and SHALL offer neither for a folder that is already a specgate project.

> Brief: "An empty folder offers five questions and creates the project with `specgate init`."

#### Scenario: SCN-341 — shop's Home on the desktop

- GIVEN the desktop app opened on `~/projects/shop`, with code and no specgate files
- WHEN the Developer looks at Home
- THEN the next step reads "Adopt this folder", not "Create the project", and opens the adoption's preview

#### Scenario: SCN-342 — An empty folder's Home in the browser

- GIVEN `specgate-studio serve` on the empty folder `~/projects/academia`
- WHEN the Developer opens the studio's address
- THEN the next step reads "Create the project", and opens the five questions
