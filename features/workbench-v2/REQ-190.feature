Feature: The panel at the bottom, right or left, maximized; the agent panel and the side bar hidden, shown and resized

  @REQ-190 @SCN-566
  Scenario: The panel on the right, on the desktop
    Given sprich in the desktop app with the panel at the bottom
    When the Developer chooses "Panel Position: Right" in the palette, then maximizes the panel
    Then the Developer sees the panel right of the editor groups, then over the editor area, and restores it with the same button

  @REQ-190 @SCN-567
  Scenario: The agent panel hidden and the side bar resized, in the browser
    Given sprich in the browser with the side bar and the agent panel shown
    When the Developer hides the agent panel and drags the side bar's edge to 400 px
    Then the Developer sees the editor groups take the agent panel's room and the side bar 400 px wide
