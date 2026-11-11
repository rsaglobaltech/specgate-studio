Feature: Each terminal keeps its scrollback

  @REQ-056 @SCN-161
  Scenario: Back to a terminal after another view, on the desktop
    Given sprich open in the desktop app, a terminal that printed the 1,200 lines of `npm test`
    When the Developer opens Changes, hides the bottom panel, then shows it and scrolls that terminal up
    Then the Developer sees all 1,200 lines of `npm test`, in order

  @REQ-056 @SCN-162
  Scenario: Switching between two terminals in the browser
    Given sprich open in the browser, one terminal that ran `git log` and another that ran `npm test`
    When the Developer switches from the second terminal to the first
    Then the Developer sees the `git log` output where it was, with none of `npm test` in it
