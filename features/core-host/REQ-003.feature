Feature: A changed file refreshes only what it feeds

  @REQ-003 @SCN-005
  Scenario: questions.md saved, on the desktop
    Given sprich open in the desktop app, all of its state read
    When the Developer saves `docs/specs/changes/draft-pedidos/questions.md`
    Then only Questions and the matrix are read again, and the UI is told that `questions` and `matrix` changed; Changes, Home and Report are not read again

  @REQ-003 @SCN-006
  Scenario: A feature file saved, in the browser
    Given sprich open in the browser, all of its state read
    When the Developer saves `features/auth/REQ-010.feature` in another editor
    Then only the matrix is read again, and the UI is told that `matrix` changed
