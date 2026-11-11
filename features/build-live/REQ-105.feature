Feature: Stop after this requirement, or now after a confirmation

  @REQ-105 @SCN-309
  Scenario: Stop now on the desktop
    Given the desktop app building REQ-030, the agent running its tests
    When the Developer presses Stop now and confirms
    Then the Developer sees the build stopped, and no process the agent started is still running

  @REQ-105 @SCN-310
  Scenario: Stop after this requirement in the browser
    Given the browser showing Live with REQ-030 building and REQ-032 queued
    When the Developer presses Stop after this requirement
    Then the Developer sees REQ-030 finish and REQ-032 not started
