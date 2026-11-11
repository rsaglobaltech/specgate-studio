Feature: Build lists what is ready, its estimate and who codes

  @REQ-101 @SCN-301
  Scenario: Build in the desktop app
    Given sprich open in the desktop app, with REQ-030 approved and ready and REQ-031 blocked by the open question Q2
    When the Developer opens Build
    Then the Developer sees REQ-030 listed with its estimate and the agent `claude`, and REQ-031 listed apart as waiting for Q2

  @REQ-101 @SCN-302
  Scenario: Build in the browser with no agent set
    Given sprich open in the browser, with REQ-030 ready and no agent set
    When the Developer opens Build
    Then the Developer sees REQ-030 listed with its estimate, no agent named, and the command that sets one: `specgate agents init --tool claude`
