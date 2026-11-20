Feature: Visible in under 300 ms, interactive in under 1 s

  @REQ-035 @SCN-099
  Scenario: Cold start of the desktop app
    Given the desktop app not running, and sprich as the last project opened
    When the Developer starts the desktop app
    Then the window with the activity bar shows in under 300 ms, and the command palette opens on Ctrl+Shift+P in under 1 s

  @REQ-035 @SCN-100
  Scenario: First load in the browser
    Given `specgate-studio serve` for sprich running and the browser's cache empty
    When the Developer opens the studio's address
    Then the activity bar shows in under 300 ms, and Changes opens from it in under 1 s
