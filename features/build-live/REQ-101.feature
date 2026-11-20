Feature: Build lists what is ready: each title with its estimate below, who codes, the adoption baseline only when named; what is ready to close, with "Aplicar"

  @REQ-101 @SCN-301
  Scenario: Build in the desktop app
    Given sprich open in the desktop app at 1280×800 px, with REQ-141 approved and ready, estimated at about 6 minutes, and REQ-031 blocked by the open question Q2
    When the Developer opens Build
    Then the Developer sees "141 · A settings editor with search, and two scopes: project and user" with "~6 min" below it and the agent `claude`, no horizontal scroll, and REQ-031 listed apart as waiting for Q2

  @REQ-101 @SCN-302
  Scenario: Build in the browser with no agent set
    Given sprich open in the browser, with REQ-141 ready and no agent set
    When the Developer opens Build
    Then the Developer sees REQ-141 listed with its title and its estimate below it, no agent named, and the button "Configurar agente" (REQ-203)

  @REQ-101 @SCN-608
  Scenario: REQ-000 only when named, on the desktop
    Given the desktop app with REQ-000, the adoption baseline, not Implemented, and REQ-141 ready
    When the Developer opens Build, then chooses "Construir REQ-000" in the palette
    Then the Developer first sees REQ-141 and no REQ-000 in the list, then REQ-000 listed and chosen

  @REQ-101 @SCN-609
  Scenario: REQ-000 named from its own page, in the browser
    Given the browser with REQ-000 open in the editor
    When the Developer presses its "▶ Construir"
    Then the Developer sees Build with REQ-000 listed and chosen, and no other requirement chosen

  @REQ-101 @SCN-631
  Scenario: REQ-142 and REQ-143 ready to close after REQ-141's run, on the desktop
    Given the desktop app after the run of REQ-141, specgate reporting REQ-142 and REQ-143 as `NEEDS_STATUS_UPDATE`, their tests in place
    When the Developer opens Build
    Then the Developer sees REQ-142 and REQ-143 under "Listos para cerrar", each with "Aplicar" and its "?", and neither among the requirements ready to build

  @REQ-101 @SCN-632
  Scenario: "Aplicar" on REQ-142, in the browser
    Given the browser showing Build with REQ-142 under "Listos para cerrar"
    When the Developer opens its "?", then presses "Aplicar"
    Then the Developer first reads that it runs `specgate apply REQ-142`, then sees the terminal echo "Aplicar REQ-142" · `specgate apply REQ-142`, and its notice
