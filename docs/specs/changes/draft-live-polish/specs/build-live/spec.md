# Delta — build-live

## MODIFIED Requirements

### Requirement: REQ-101 — Build lists what is ready: each title with its estimate below, who codes, REQ-000 only when named

<!-- specgate:trace actor=Developer feature=features/build-live/REQ-101.feature kind=functional -->

The system SHALL list in Build every requirement ready to build — approved, with its scenario and no open question blocking it — each with its id, its title on the row's full width, wrapped and never cut to nothing, its estimate on a line below the title, and the agent that will code it, with no horizontal scroll; SHALL say for each one left out why it is not ready; and SHALL leave out REQ-000, the adoption baseline, unless the Developer names it.

> Brief: "When Build lists what is ready, each requirement shows its title with its estimate below it, and REQ-000, the adoption baseline, appears only once the Developer names it."

#### Scenario: SCN-301 — Build in the desktop app

- GIVEN sprich open in the desktop app at 1280×800 px, with REQ-141 approved and ready, estimated at about 6 minutes, and REQ-031 blocked by the open question Q2
- WHEN the Developer opens Build
- THEN the Developer sees "141 · A settings editor with search, and two scopes: project and user" with "~6 min" below it and the agent `claude`, no horizontal scroll, and REQ-031 listed apart as waiting for Q2

#### Scenario: SCN-302 — Build in the browser with no agent set

- GIVEN sprich open in the browser, with REQ-141 ready and no agent set
- WHEN the Developer opens Build
- THEN the Developer sees REQ-141 listed with its title and its estimate below it, no agent named, and the button "Configurar agente" (REQ-203)

#### Scenario: SCN-608 — REQ-000 only when named, on the desktop

- GIVEN the desktop app with REQ-000, the adoption baseline, not Implemented, and REQ-141 ready
- WHEN the Developer opens Build, then chooses "Construir REQ-000" in the palette
- THEN the Developer first sees REQ-141 and no REQ-000 in the list, then REQ-000 listed and chosen

#### Scenario: SCN-609 — REQ-000 named from its own page, in the browser

- GIVEN the browser with REQ-000 open in the editor
- WHEN the Developer presses its "▶ Construir"
- THEN the Developer sees Build with REQ-000 listed and chosen, and no other requirement chosen

### Requirement: REQ-102 — Build waits on uncommitted work and offers commit, stash or ignore; the commit's message labelled

<!-- specgate:trace actor=Developer feature=features/build-live/REQ-102.feature kind=business-rule -->

The system SHALL, when the project has uncommitted files that are not the specification, refuse to start a build, say why — the agent works on its own branch from the last commit and would leave that work out — and offer to commit, stash or ignore it, each run only after the Developer confirms it, and showing the files it touches grouped by folder; and SHALL show, when the Developer chooses commit, a labelled message field in the dialog and a Confirm that, while the message is empty, is disabled and says next to it that a message is needed.

> Brief: "When the Developer commits uncommitted work before a build, the dialog shows a labelled message field, and Confirm says why it is disabled until a message is written."

#### Scenario: SCN-303 — sprich's 325 files committed from the desktop app

- GIVEN sprich open in the desktop app with 325 uncommitted files, and REQ-030 ready
- WHEN the Developer presses Build on REQ-030, chooses commit, writes the message "Work in progress before building REQ-030" and confirms
- THEN the Developer sees the 325 files grouped by folder before confirming, then one commit with that message, and the build of REQ-030 starts

#### Scenario: SCN-304 — Stash refused until confirmed, in the browser

- GIVEN sprich open in the browser with uncommitted files outside the specification
- WHEN the Developer presses Build, chooses stash and cancels the confirmation
- THEN nothing is stashed, the files stay as they were, and Build still says why it waits

#### Scenario: SCN-610 — Confirm disabled until a message is written, in the browser

- GIVEN the browser showing Build waiting on 10 uncommitted files
- WHEN the Developer chooses commit and leaves the message empty, then writes "Agent set up"
- THEN the Developer first sees the field labelled "Mensaje del commit" and Confirm disabled with "Escribe un mensaje para confirmar" beside it, then Confirm enabled and that line gone

#### Scenario: SCN-611 — The same dialog in English, on the desktop

- GIVEN the desktop app in English, Build waiting on 10 uncommitted files
- WHEN the Developer chooses commit
- THEN the Developer sees the field labelled "Commit message" in view without scrolling, and Confirm disabled with "Write a message to confirm" beside it

### Requirement: REQ-103 — Live as the "En vivo" board: the harness's stages, a header with counts, time, tokens and cost, the queue and what is finished

<!-- specgate:trace actor=Developer feature=features/build-live/REQ-103.feature kind=functional -->

The system SHALL show in Live, while a build runs, the requirement in progress with its title and "intento N de M" and its branch; its steps as the harness's stages — "Rama creada", the setup with its command, "Agente escribiendo · test primero, después el código", "Gate: validate", "Gate: tests", "Gate: arquitectura" and "Aplicar · commit en su rama" — each marked ✓ done, ● running, ○ waiting or ✗ failed, with the time it took or, while it runs, a timer that advances every second; a header with the requirements passed, running and failed, the time elapsed, the tokens and the cost so far; on the left the modules and the queue, each queued requirement with its estimate; and on the right NECESITA ATENCIÓN and TERMINADOS, each finished requirement with its time and cost. From the moment the run starts a step SHALL be running, so Live never shows an empty step list while a build runs.

> Brief: "While a build runs, Live shows the harness's stages for each requirement — "Rama creada", the setup, "intento N de M", "Agente escribiendo · test primero, después el código" with a running timer, "Gate: validate", "Gate: tests", "Gate: arquitectura" and "Aplicar · commit en su rama" — each with ✓, ●, ○ or ✗ and its time; a header with passed, running and failed counts, the time elapsed, tokens, cost, "Parar tras este requisito" and "Parar ya…"; the modules and the queue with estimates on the left; NECESITA ATENCIÓN and TERMINADOS with time and cost on the right."

#### Scenario: SCN-305 — Live during the build of REQ-141 on the desktop

- GIVEN the desktop app building REQ-141 in its first attempt of 3, REQ-142 queued after it, and the setup `npm ci` done in 4,5 s
- WHEN the Developer opens Live
- THEN the Developer sees "Rama creada ✓ 0,2 s", the setup ✓ 4,5 s, "Agente escribiendo" ● with its timer advancing, the three gates and "Aplicar · commit en su rama" ○, "intento 1 de 3", REQ-142 in the queue with its estimate, and the header's counts, elapsed time, tokens and cost

#### Scenario: SCN-306 — Live opened in a second browser tab mid-build

- GIVEN a build of REQ-141 started in one browser tab, its agent writing for 3:41
- WHEN the Developer opens Live in a second tab
- THEN the Developer sees the same steps with "Agente escribiendo" at 3:41 and advancing, the queue, the header's counts, tokens and cost

#### Scenario: SCN-612 — The first seconds are never empty, on the desktop

- GIVEN the desktop app, the Developer having just pressed Build on REQ-141, the setup `npm ci` running and the agent not yet started
- WHEN the Developer opens Live
- THEN the Developer sees "Rama creada ✓", the setup ● with its timer advancing and the other stages ○, never "No se está construyendo ningún requisito"

#### Scenario: SCN-613 — A finished requirement and a failed gate, in the browser

- GIVEN the browser showing Live, REQ-141 passed in 9 min for 0,57 $, and REQ-142's "Gate: tests" failing in its first attempt
- WHEN the Developer looks at Live
- THEN the Developer sees REQ-141 under TERMINADOS with ✓, its time and cost, the header counting 1 passed, "Gate: tests" ✗ with its time on REQ-142, and "intento 2 de 3" starting

### Requirement: REQ-105 — "Parar tras este requisito", or "Parar ya…" after a confirmation, in Live's header

<!-- specgate:trace actor=Developer feature=features/build-live/REQ-105.feature kind=business-rule -->

The system SHALL offer in Live's header, while a build runs, "Parar tras este requisito", which stops the build after the requirement in progress, and "Parar ya…", which stops it at once after the Developer confirms; and SHALL end every process the agent started when it stops.

> Brief: "While a build runs, Live shows the harness's stages for each requirement — "Rama creada", the setup, "intento N de M", "Agente escribiendo · test primero, después el código" with a running timer, "Gate: validate", "Gate: tests", "Gate: arquitectura" and "Aplicar · commit en su rama" — each with ✓, ●, ○ or ✗ and its time; a header with passed, running and failed counts, the time elapsed, tokens, cost, "Parar tras este requisito" and "Parar ya…"; the modules and the queue with estimates on the left; NECESITA ATENCIÓN and TERMINADOS with time and cost on the right."

#### Scenario: SCN-309 — Stop now on the desktop

- GIVEN the desktop app building REQ-030, the agent running its tests
- WHEN the Developer presses "Parar ya…" in Live's header and confirms
- THEN the Developer sees the build stopped, and no process the agent started is still running

#### Scenario: SCN-310 — Stop after this requirement in the browser

- GIVEN the browser showing Live with REQ-030 building and REQ-032 queued
- WHEN the Developer presses "Parar tras este requisito" in Live's header
- THEN the Developer sees REQ-030 finish and REQ-032 not started
