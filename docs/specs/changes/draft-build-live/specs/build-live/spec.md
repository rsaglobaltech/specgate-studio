# Delta — build-live

## ADDED Requirements

### Requirement: REQ-101 — Build lists what is ready, its estimate and who codes

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL list in Build every requirement ready to build — approved, with its scenario and no open question blocking it — each with its estimate and the agent that will code it, and SHALL say for each one left out why it is not ready.

> Brief: "Build lists what is ready, its estimate, and who codes."

#### Scenario: SCN-301 — Build in the desktop app

- GIVEN sprich open in the desktop app, with REQ-030 approved and ready and REQ-031 blocked by the open question Q2
- WHEN the Developer opens Build
- THEN the Developer sees REQ-030 listed with its estimate and the agent `claude`, and REQ-031 listed apart as waiting for Q2

#### Scenario: SCN-302 — Build in the browser with no agent set

- GIVEN sprich open in the browser, with REQ-030 ready and no agent set
- WHEN the Developer opens Build
- THEN the Developer sees REQ-030 listed with its estimate, no agent named, and the command that sets one: `specgate agents init --tool claude`

### Requirement: REQ-102 — Build waits on uncommitted work and offers commit, stash or ignore

<!-- specgate:trace actor=Developer kind=business-rule -->

The system SHALL, when the project has uncommitted files that are not the specification, refuse to start a build, say why — the agent works on its own branch from the last commit and would leave that work out — and offer to commit, stash or ignore it, each run only after the Developer confirms it, and showing the files it touches grouped by folder.

> Brief: "With uncommitted work that is not the specification, Build explains why it waits and offers commit, stash or ignore, each confirmed."

#### Scenario: SCN-303 — sprich's 325 files committed from the desktop app

- GIVEN sprich open in the desktop app with 325 uncommitted files, and REQ-030 ready
- WHEN the Developer presses Build on REQ-030, chooses commit, writes the message "Work in progress before building REQ-030" and confirms
- THEN the Developer sees the 325 files grouped by folder before confirming, then one commit with that message, and the build of REQ-030 starts

#### Scenario: SCN-304 — Stash refused until confirmed, in the browser

- GIVEN sprich open in the browser with uncommitted files outside the specification
- WHEN the Developer presses Build, chooses stash and cancels the confirmation
- THEN nothing is stashed, the files stay as they were, and Build still says why it waits

### Requirement: REQ-103 — Live shows each step, the agent's output, the queue, cost and tokens

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL show in Live, while a build runs, each requirement's steps with the time each took, the agent's output as it streams, the requirements still queued, and the cost and tokens spent so far.

> Brief: "Live shows each requirement's steps with their time, the agent's output as it streams, the queue, cost and tokens."

#### Scenario: SCN-305 — Live during the build of REQ-030 on the desktop

- GIVEN the desktop app building REQ-030 with REQ-032 queued after it
- WHEN the Developer opens Live
- THEN the Developer sees REQ-030's finished steps with their times and the current step running, the agent's output growing as it writes, REQ-032 in the queue, and the cost and tokens so far

#### Scenario: SCN-306 — Live opened in a second browser tab mid-build

- GIVEN a build of REQ-030 started in one browser tab
- WHEN the Developer opens Live in a second tab
- THEN the Developer sees the same steps, the agent's output so far and from then on, the queue, cost and tokens

### Requirement: REQ-104 — The agent's question is answered inside Live

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL show inside Live a question the agent asks while it builds, with the requirement it is about, and SHALL send the Developer's answer to it there, through specgate, without leaving Live.

> Brief: "The agent's question is answered inside Live."

#### Scenario: SCN-307 — A question answered on the desktop

- GIVEN the desktop app building REQ-030, and the agent asking "Round to the cent or to the nearest 5 cents?"
- WHEN the Developer answers "to the cent" in Live
- THEN the Developer sees the answer recorded under the question and the agent's output continuing

#### Scenario: SCN-308 — The same question in the browser

- GIVEN the browser showing Live for the same build and question
- WHEN the Developer answers it there
- THEN the Developer sees the answer recorded and the question gone from every open tab

### Requirement: REQ-105 — Stop after this requirement, or now after a confirmation

<!-- specgate:trace actor=Developer kind=business-rule -->

The system SHALL offer to stop a build after the requirement in progress, or at once after the Developer confirms, and SHALL end every process the agent started when it stops.

> Brief: "Stop after this requirement, or stop now after a confirmation; stopping ends every process the agent started."

#### Scenario: SCN-309 — Stop now on the desktop

- GIVEN the desktop app building REQ-030, the agent running its tests
- WHEN the Developer presses Stop now and confirms
- THEN the Developer sees the build stopped, and no process the agent started is still running

#### Scenario: SCN-310 — Stop after this requirement in the browser

- GIVEN the browser showing Live with REQ-030 building and REQ-032 queued
- WHEN the Developer presses Stop after this requirement
- THEN the Developer sees REQ-030 finish and REQ-032 not started
