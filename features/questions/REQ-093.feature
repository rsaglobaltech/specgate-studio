Feature: "The spec says it" marks the answer reviewed and lifts Needs Clarification

  @REQ-093 @SCN-275
  Scenario: Q1 confirmed on the desktop
    Given sprich open in the desktop app, Q1 answered "50 €" and REQ-034 already revised to say "50 €"
    When the Reviewer presses "The spec says it" on Q1
    Then the studio runs `specgate answer Q1 --reviewed --change draft-pedidos`, Q1 leaves the open questions, and REQ-034 no longer shows Needs Clarification

  @REQ-093 @SCN-276
  Scenario: Q1 confirmed in the browser
    Given sprich open in the browser, Q1 answered "50 €" and REQ-034 already revised to say "50 €"
    When the Reviewer presses "The spec says it" on Q1
    Then the Reviewer sees Q1 reviewed and REQ-034 unblocked, and the notice names the command that ran and the files it wrote
