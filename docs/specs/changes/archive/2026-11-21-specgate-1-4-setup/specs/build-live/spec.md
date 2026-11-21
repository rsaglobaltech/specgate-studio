# Delta — build-live

## MODIFIED Requirements

### Requirement: REQ-101 — Build lists what is ready: each title with its estimate below, who codes, the adoption baseline only when named; what is ready to close, with "Aplicar"

The system SHALL list in Build every requirement ready to build — approved, with its scenario and no open question blocking it — each with its id, its title on the row's full width, wrapped and never cut to nothing, its estimate on a line below the title, and the agent that will code it, with no horizontal scroll; SHALL say for each one left out why it is not ready; SHALL leave out the adoption baseline, as REQ-230 tells it — REQ-001 "Preserve existing behaviour" since specgate 1.4, REQ-000 before — unless the Developer names it; and SHALL list apart, under "Listos para cerrar" / "Ready to close", every requirement specgate reports as only its status left to update (`NEEDS_STATUS_UPDATE`, "its test is in place"), each with an "Aplicar" / "Apply" button and its "?", the button running `specgate apply <REQ>` in the terminal with its notice.

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

<!-- specgate:trace status=Implemented feature=features/build-live/REQ-101.feature actor=Developer kind=functional -->
