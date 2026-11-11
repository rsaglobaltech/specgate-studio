Feature: Saving writes the file, and nothing else is written without the person

  @REQ-045 @SCN-129
  Scenario: Saving pedidos' spec on the desktop
    Given the desktop app with `docs/specs/changes/draft-pedidos/specs/pedidos/spec.md` open, an unsaved edit in it, and a clean git working tree
    When the Developer saves it
    Then `git status` shows that one file modified and nothing else, and no specgate command that writes has run

  @REQ-045 @SCN-130
  Scenario: Closing an unsaved file in the browser
    Given the browser with that file open and an unsaved edit in it
    When the Developer closes its tab
    Then the studio asks whether to save it, and when the Developer chooses not to, the file on disk is unchanged
