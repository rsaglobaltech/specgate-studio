Feature: A command the studio runs is echoed with the button that started it

  @REQ-053 @SCN-155
  Scenario: "Check" prints `specgate check` and its stages on the desktop
    Given sprich open in the desktop app, its terminal panel closed
    When the Developer presses "Check"
    Then the Developer sees the terminal open with the line `▶ "Check" · specgate check`, then each stage of `specgate check` as it runs, then `exit 0`

  @REQ-053 @SCN-156
  Scenario: "Check" pressed in the browser, while a terminal is busy
    Given sprich open in the browser, its terminal running `npm run dev`
    When the Developer presses "Check"
    Then the Developer sees `▶ "Check" · specgate check` and its stages in the studio's own terminal, and `npm run dev` keeps running in the other terminal, its output untouched
