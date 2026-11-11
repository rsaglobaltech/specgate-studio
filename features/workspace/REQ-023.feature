Feature: The watcher keeps up with 50,000 files

  @REQ-023 @SCN-065
  Scenario: A save in a project of 50,000 files, on the desktop
    Given a project of 50,000 files open in the desktop app
    When the Developer saves `docs/specs/changes/draft-pedidos/questions.md`
    Then the Developer sees Questions read again within 500 ms of the save

  @REQ-023 @SCN-066
  Scenario: The same in the browser
    Given a project of 50,000 files open in the browser
    When the Developer saves `spec.md` from the editor
    Then the Developer sees the save in the uncommitted files within 500 ms
