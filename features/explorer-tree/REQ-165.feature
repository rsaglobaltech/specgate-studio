Feature: The tree by keyboard: arrows, Enter, F2 and Delete

  @REQ-165 @SCN-490
  Scenario: Into `docs` and open the brief, on the desktop
    Given sprich in the desktop app, the tree focused on the closed folder `docs`
    When the Developer presses Right, Right and Enter
    Then the Developer sees `docs` open, `docs/brief.md` selected and open in the editor

  @REQ-165 @SCN-491
  Scenario: F2 renames the note, in the browser
    Given sprich in the browser, the tree focused on `docs/notes.md`
    When the Developer presses F2, types `notes-old.md` and presses Enter
    Then the Developer sees `docs/notes-old.md` selected in the tree, no `docs/notes.md`, and the file renamed on disk
