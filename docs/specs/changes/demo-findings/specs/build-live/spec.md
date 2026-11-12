# Delta — build-live

## MODIFIED Requirements

### Requirement: REQ-101 — Build lists what is ready: each title with its estimate below, who codes, REQ-000 only when named; what is ready to close, with "Aplicar"

<!-- specgate:trace feature=features/build-live/REQ-101.feature actor=Developer kind=functional -->

The system SHALL list in Build every requirement ready to build — approved, with its scenario and no open question blocking it — each with its id, its title on the row's full width, wrapped and never cut to nothing, its estimate on a line below the title, and the agent that will code it, with no horizontal scroll; SHALL say for each one left out why it is not ready; SHALL leave out REQ-000, the adoption baseline, unless the Developer names it; and SHALL list apart, under "Listos para cerrar" / "Ready to close", every requirement specgate reports as only its status left to update (`NEEDS_STATUS_UPDATE`, "its test is in place"), each with an "Aplicar" / "Apply" button and its "?", the button running `specgate apply <REQ>` in the terminal with its notice.

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

#### Scenario: SCN-631 — REQ-142 and REQ-143 ready to close after REQ-141's run, on the desktop

- GIVEN the desktop app after the run of REQ-141, specgate reporting REQ-142 and REQ-143 as `NEEDS_STATUS_UPDATE`, their tests in place
- WHEN the Developer opens Build
- THEN the Developer sees REQ-142 and REQ-143 under "Listos para cerrar", each with "Aplicar" and its "?", and neither among the requirements ready to build

#### Scenario: SCN-632 — "Aplicar" on REQ-142, in the browser

- GIVEN the browser showing Build with REQ-142 under "Listos para cerrar"
- WHEN the Developer opens its "?", then presses "Aplicar"
- THEN the Developer first reads that it runs `specgate apply REQ-142`, then sees the terminal echo "Aplicar REQ-142" · `specgate apply REQ-142`, and its notice

### Requirement: REQ-103 — Live as the "En vivo" board: the harness's stages, a header with counts, time and usage, the queue and what is finished

<!-- specgate:trace feature=features/build-live/REQ-103.feature actor=Developer kind=functional -->

The system SHALL show in Live, while a build runs, the requirement in progress with its title and "intento N de M" and its branch; its steps as the harness's stages — "Rama creada", the setup with its command, "Agente escribiendo · test primero, después el código", "Gate: validate", "Gate: tests", "Gate: arquitectura" and "Aplicar · commit en su rama" — each marked ✓ done, ● running, ○ waiting or ✗ failed, with the time it took as specgate's events give it or, while it runs, a timer that advances every second; "Rama creada" with "—" while specgate gives no time of its own for it, never the wait before the requirement's first event; a header with the requirements passed, running and failed, the time elapsed, and the usage so far — tokens, turns and the dollar figure as REQ-211 labels it; on the left the modules and the queue, each queued requirement with its estimate; and on the right NECESITA ATENCIÓN and TERMINADOS, each finished requirement with its time and its usage. From the moment the run starts a step SHALL be running, so Live never shows an empty step list while a build runs. Each queued requirement's run SHALL be echoed in the studio's terminal with its own button, "Construir <REQ>", whichever button was pressed last.

> Brief: "While a build runs, Live shows the harness's stages for each requirement — "Rama creada", the setup, "intento N de M", "Agente escribiendo · test primero, después el código" with a running timer, "Gate: validate", "Gate: tests", "Gate: arquitectura" and "Aplicar · commit en su rama" — each with ✓, ●, ○ or ✗ and its time; a header with passed, running and failed counts, the time elapsed, tokens, cost, "Parar tras este requisito" and "Parar ya…"; the modules and the queue with estimates on the left; NECESITA ATENCIÓN and TERMINADOS with time and cost on the right."

#### Scenario: SCN-305 — Live during the build of REQ-141 on the desktop

- GIVEN the desktop app building REQ-141 in its first attempt of 3, REQ-142 queued after it, and the setup `npm ci` done in 4,5 s
- WHEN the Developer opens Live
- THEN the Developer sees "Rama creada ✓ —", the setup ✓ 4,5 s, "Agente escribiendo" ● with its timer advancing, the three gates and "Aplicar · commit en su rama" ○, "intento 1 de 3", REQ-142 in the queue with its estimate, and the header's counts, elapsed time, tokens, turns and "≈ 1,10 $ precio de API"

#### Scenario: SCN-306 — Live opened in a second browser tab mid-build

- GIVEN a build of REQ-141 started in one browser tab, its agent writing for 3:41
- WHEN the Developer opens Live in a second tab
- THEN the Developer sees the same steps with "Agente escribiendo" at 3:41 and advancing, the queue, the header's counts, tokens, turns and "≈ $0.42 API price"

#### Scenario: SCN-612 — The first seconds are never empty, on the desktop

- GIVEN the desktop app, the Developer having just pressed Build on REQ-141, the setup `npm ci` running and the agent not yet started
- WHEN the Developer opens Live
- THEN the Developer sees "Rama creada ✓", the setup ● with its timer advancing and the other stages ○, never "No se está construyendo ningún requisito"

#### Scenario: SCN-613 — A finished requirement and a failed gate, in the browser

- GIVEN the browser showing Live, REQ-141 passed in 9 min for 0,57 $ at API prices, and REQ-142's "Gate: tests" failing in its first attempt
- WHEN the Developer looks at Live
- THEN the Developer sees REQ-141 under TERMINADOS with ✓, its time, its tokens and "≈ 0,57 $", the header counting 1 passed, "Gate: tests" ✗ with its time on REQ-142, and "intento 2 de 3" starting

#### Scenario: SCN-633 — Each queued run echoed with its own button, on the desktop

- GIVEN the desktop app building REQ-141, the Developer having pressed "Construir REQ-142" and then "Construir REQ-143", both queued
- WHEN REQ-141 ends and REQ-142 starts, then REQ-143
- THEN the Developer sees in the studio's terminal `▶ "Construir REQ-142" · specgate harness run --req REQ-142`, then `▶ "Construir REQ-143" · specgate harness run --req REQ-143`

#### Scenario: SCN-634 — "Rama creada" not charged with the wait, in the browser

- GIVEN the browser, REQ-142's turn come 33 s before its first event, and specgate giving no time for its branch
- WHEN the Developer opens Live
- THEN the Developer sees "Rama creada ✓ —", not "33 s", and the setup with its own time

## ADDED Requirements

### Requirement: REQ-211 — What the agent spent as usage, its dollars "≈ precio de API" unless the Developer pays per use

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL show, wherever it shows what the agent spent — the status bar, Home's agent card, Live's header and TERMINADOS — the usage: the tokens, the turns when specgate gives them, and the dollar figure Claude Code reports labelled "≈ precio de API" / "≈ API price", because on a Claude subscription that figure is what the work would cost at API prices, not a charge, and specgate's events do not say how the agent is billed; and SHALL label the figure "Coste" / "Cost" only once the Developer set, from the palette's "Facturación: pago por uso de la API" / "Billing: pay per use of the API", that they pay per use, a choice remembered on this machine with its "?" and its notice.

#### Scenario: SCN-635 — On a subscription, on the desktop

- GIVEN the desktop app after REQ-141 was built for 182 k tokens in 120 turns, Claude Code reporting 1,10 $, and no billing set
- WHEN the Developer looks at the status bar, Home and Live
- THEN the Developer sees "Uso" with the tokens and "≈ 1,10 $ precio de API" in each, and "Coste" in none

#### Scenario: SCN-636 — Paying per use, in the browser

- GIVEN the browser in English, after the same build
- WHEN the Developer opens the "?" of "Billing: pay per use of the API" in the palette, then chooses it
- THEN the Developer first reads that it runs no command and only changes how the figure is labelled, then its notice, and "Cost $1.10" in the status bar and Live's header, and no "API price"
