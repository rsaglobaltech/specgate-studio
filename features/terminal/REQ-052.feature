Feature: The same terminal on macOS, Windows and Linux

  @REQ-052 @SCN-153
  Scenario: PowerShell on the Windows desktop
    Given sprich open in the desktop app on Windows
    When the Developer opens a new terminal and types `Get-Location`
    Then the Developer sees a PowerShell prompt, and `Get-Location` prints the folder of sprich

  @REQ-052 @SCN-154
  Scenario: A full-screen program in the browser
    Given sprich open in the browser on macOS, with a terminal open
    When the Developer types `less spec.md`, then `q`
    Then the Developer sees `spec.md` paged over the whole terminal, and after `q` the prompt again with the earlier lines in place
