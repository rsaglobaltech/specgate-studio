Feature: Several terminals at once

  @REQ-055 @SCN-159
  Scenario: Two terminals running at once on the desktop
    Given sprich open in the desktop app, a terminal running `npm test`
    When the Developer opens a second terminal and types `git status`
    Then the Developer sees both terminals listed in the bottom panel, `git status` answered in the second while `npm test` keeps running in the first

  @REQ-055 @SCN-160
  Scenario: Closing one terminal in the browser
    Given sprich open in the browser with three terminals open
    When the Developer closes the second one
    Then the Developer sees two terminals listed, the first and the third with their shells still running and their output in place
