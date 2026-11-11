Feature: An answer is written to its row, and the requirement stays blocked

  @REQ-092 @SCN-273
  Scenario: Q1 answered "50 €" on the desktop
    Given sprich open in the desktop app, Q1 of `draft-pedidos` open and blocking REQ-034
    When the Reviewer answers Q1 "50 €" in Questions
    Then the studio runs `specgate answer Q1 "50 €" --change draft-pedidos`, Q1's row of `questions.md` reads "50 €", and REQ-034 still shows Needs Clarification, blocked until confirmed

  @REQ-092 @SCN-274
  Scenario: Q1 answered "50 €" in the browser
    Given sprich open in the browser, Q1 of `draft-pedidos` open and blocking REQ-034
    When the Reviewer answers Q1 "50 €" in Questions
    Then the Reviewer sees Q1 answered "50 €" and waiting for "The spec says it", and REQ-034 still blocked
