Feature: A Tauri 2 window, the core host as a sidecar with its own Node runtime

  @REQ-151 @SCN-451
  Scenario: The studio opens sprich in 0.8 s on a cold start
    Given a Mac with no Node installed, the studio installed and not running, and sprich as the last project opened
    When the Developer starts the studio
    Then sprich's Home is shown and usable in 0.8 s, served by the studio's own sidecar on 127.0.0.1

  @REQ-151 @SCN-452
  Scenario: Closing the window ends its sidecar, on Windows
    Given the desktop app on Windows with sprich open and a terminal running in it
    When the Developer closes sprich's window
    Then no sidecar process and no process it started is still running
