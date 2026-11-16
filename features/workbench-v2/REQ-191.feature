Feature: The layout saved per project and restored; small windows collapse it without losing it

  @REQ-191 @SCN-568
  Scenario: sprich reopened, in the browser
    Given sprich in the browser closed with REQ-031's spec left, `REQ-031.feature` right, the panel on the right
    When the Developer opens sprich again
    Then the Developer sees the same two groups with the same tabs and sizes and the panel on the right

  @REQ-191 @SCN-569
  Scenario: A narrow window, on the desktop
    Given sprich in the desktop app with two groups side by side, the side bar and the agent panel shown
    When the Developer narrows the window to 800 px, then widens it to 1440 px again
    Then the Developer first sees one group with both files as tabs, the side bar and the agent panel collapsed to their bars, then the two groups and both panels as they were
