Feature: The branch, and the team and ticket it names

  @REQ-024 @SCN-067
  Scenario: A ticket branch on the desktop
    Given sprich on the branch `feature/pagos/SPR-42`
    When the Developer opens sprich in the desktop app
    Then the Developer sees the branch `feature/pagos/SPR-42`, the team `pagos` and the ticket `SPR-42`

  @REQ-024 @SCN-068
  Scenario: Another branch in the browser
    Given sprich on the branch `feat/mvp-fase-1`
    When the Developer opens sprich in the browser
    Then the Developer sees the branch `feat/mvp-fase-1`, and no team and no ticket
