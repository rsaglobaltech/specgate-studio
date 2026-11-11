Feature: A terminal in the project's folder, with the Developer's shell

  @REQ-051 @SCN-151
  Scenario: A new terminal on the desktop starts in sprich
    Given sprich open in the desktop app on macOS, where the Developer's shell is `zsh`
    When the Developer opens a new terminal in the bottom panel and types `pwd`
    Then the Developer sees the prompt of their `zsh`, and `pwd` prints the folder of sprich

  @REQ-051 @SCN-152
  Scenario: A new terminal in the browser starts in sprich
    Given sprich open in the browser with `specgate-studio serve` on Linux, where the Developer's shell is `bash`
    When the Developer opens a new terminal in the bottom panel and types `pwd`
    Then the Developer sees the prompt of their `bash`, and `pwd` prints the folder of sprich
