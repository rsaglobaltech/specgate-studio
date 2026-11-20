Feature: One window per project, each over its own core host

  @REQ-152 @SCN-453
  Scenario: A second project opens a second window, on macOS
    Given the desktop app with sprich open in one window
    When the Developer opens the folder `~/mvp/specgate-studio` from the Recent list
    Then a second window opens on specgate-studio with its own core host, and sprich's window and host are unchanged

  @REQ-152 @SCN-454
  Scenario: Opening sprich again focuses its window, on Linux
    Given the desktop app on Linux with sprich open in one window
    When the Developer opens `~/mvp/sprich-platform/sprich` again
    Then sprich's window comes to the front, and still exactly one window and one core host run for sprich
