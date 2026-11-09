Feature: A command followed as events

  @REQ-005 @SCN-009
  Scenario: Check on the desktop
    Given sprich open in the desktop app
    When the Developer presses Check
    Then the UI receives `started` with `specgate check`, `output` with each stage as specgate prints it, and `ended` with exit code 0

  @REQ-005 @SCN-010
  Scenario: A refused apply in the browser
    Given sprich open in the browser, REQ-007 with no test that names it
    When the Developer delivers REQ-007
    Then the UI receives `started` with `specgate apply REQ-007`, its output, and `ended` with exit code 1
