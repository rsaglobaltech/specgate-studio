Feature: The next step as specgate 1.0 names it, the migration first

  @REQ-215 @SCN-963
  Scenario: The next command from next, on the desktop
    Given sprich on specgate 1.0 in the desktop app, `status --json` naming `specgate apply REQ-172` under `next`
    When the Developer opens Home
    Then the Developer sees "Apply REQ-172" as the next step

  @REQ-215 @SCN-964
  Scenario: Eleven changes written for 0.x, in the browser
    Given the studio's own repository on specgate 1.0 in the browser, eleven open changes written for 0.x
    When the Developer opens Home
    Then the Developer sees "Move the project to specgate 1.0", that 11 open changes were written for 0.x, and `specgate migrate 1.0`
