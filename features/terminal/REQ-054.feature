Feature: What the studio echoes is shown, never typed into the Developer's shell

  @REQ-054 @SCN-157
  Scenario: A change name with a semicolon, on the desktop
    Given sprich open in the desktop app, with the change `add-coupons; rm -rf .` listed
    When the Developer presses "Check" on that change
    Then the Developer sees the echo name `add-coupons; rm -rf .` as one argument, no shell runs `rm`, and every file of sprich is still there

  @REQ-054 @SCN-158
  Scenario: Typing into the studio's terminal in the browser
    Given sprich open in the browser, the studio's own terminal showing the end of `specgate check`
    When the Developer types `ls` and Enter into that terminal
    Then the Developer sees nothing typed and nothing run there, and a note that commands are typed in a terminal of their own, with the button that opens one
