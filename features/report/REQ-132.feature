Feature: The gate by stage, with the fix of what fails

  @REQ-132 @SCN-393
  Scenario: The tests stage failed, on the desktop
    Given sprich open in the desktop app, its last gate passed the specification, has no architecture check, and failed at the tests stage with `check_tests_failed`
    When the Developer opens Report
    Then the Developer sees specification passed, architecture not configured, tests failed with `check_tests_failed` and the fix "Make `npm test` pass, then run `specgate check` again.", and the quality checks not run

  @REQ-132 @SCN-394
  Scenario: No gate recorded yet, in the browser
    Given sprich open in the browser, specgate with no gate recorded for it
    When the Developer opens Report
    Then the Developer sees that no gate has run yet, and the command `specgate check` beside a Check button

  @REQ-132 @SCN-398
  Scenario: The last gate after a restart, on the desktop
    Given sprich's last gate recorded by specgate as failed at the tests stage, and the desktop app restarted since
    When the Developer opens Report
    Then the Developer sees that gate, stage by stage, with when it ran, and no gate was run to show it
