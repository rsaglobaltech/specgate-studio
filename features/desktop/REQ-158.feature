Feature: The same UI in a browser with `specgate-studio serve`

  @REQ-158 @SCN-464
  Scenario: sprich in the browser, beside the desktop app
    Given the desktop app with sprich open
    When the Developer runs `specgate-studio serve` in sprich's folder and opens the address it prints in the browser
    Then the browser shows the same workbench as the desktop window, and still exactly one core host runs for sprich

  @REQ-158 @SCN-465
  Scenario: An answer in the browser shows in the desktop window
    Given sprich open in the desktop app and in the browser, its question Q2 open
    When the Developer answers Q2 in the browser
    Then the desktop window shows Q2 answered without a reload
