Feature: The in-process adapter, once specgate publishes its API

  @REQ-014 @SCN-037
  Scenario: Home on the desktop without a specgate process
    Given a specgate that publishes its in-process API, and sprich open in the desktop app
    When the Developer opens Home
    Then the Developer sees Home's data and no specgate process was started to read it

  @REQ-014 @SCN-038
  Scenario: The CLI adapter where the API lacks a command, in the browser
    Given the in-process API offers `status` but not `report`
    When the Developer opens Report in the browser
    Then the Developer sees the report, read by the CLI adapter with `specgate report --json`
