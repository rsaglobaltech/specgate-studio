Feature: Each requirement offers its next step, and an action under way shows on its card

  @REQ-243 @SCN-1022
  Scenario: Build for a requirement with no test, Apply for one whose test is there, in the browser
    Given sprich in the browser, draft-pedidos approved, REQ-030 needing a test and code and REQ-031 with its test and code waiting for its status
    When the Developer opens Changes
    Then REQ-030 offers "Build" and no Apply, REQ-031 offers "Apply"; "Build" opens the Build view

  @REQ-243 @SCN-1023
  Scenario: An approval under way, on the desktop
    Given sprich on the desktop, draft-pedidos waiting for its discover layer, and specgate slow to approve it
    When the Reviewer presses its Approve
    Then the card shows the approval under way with its seconds until specgate answers
