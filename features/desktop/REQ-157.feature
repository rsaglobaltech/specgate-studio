Feature: Idle memory under 200 MB; installer under 80 MB

  @REQ-157 @SCN-462
  Scenario: Memory and size measured on the desktop
    Given the release build of the desktop app on macOS, Windows and Linux, sprich open and untouched for 60 s
    When the Developer reads the memory of the app's processes and the size of each installer
    Then the memory is under 200 MB on each system, and the .dmg, the .msi, the .AppImage and the .deb are each under 80 MB

  @REQ-157 @SCN-463
  Scenario: The host idle under `specgate-studio serve`, in the browser
    Given `specgate-studio serve` for sprich, one browser tab open on it, untouched for 60 s
    When the Developer reads the memory of the host's process
    Then it is under 200 MB
