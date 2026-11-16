Feature: The tree's "?" and its notices, in English and Spanish

  @REQ-168 @SCN-499
  Scenario: The Reviewer reads what Delete does, on the desktop in Spanish
    Given sprich in the desktop app in Spanish, the Reviewer on the context menu of `docs/notes.md`
    When the Reviewer presses the "?" beside "Eliminar"
    Then the Reviewer sees, under "[ POR DEBAJO ]", that it moves `docs/notes.md` to the trash after a confirmation, writes nothing else and commits nothing — in Spanish

  @REQ-168 @SCN-500
  Scenario: The Reviewer reads what the Explorer shows, in the browser
    Given sprich in the browser in English
    When the Reviewer presses the "?" in the Explorer's header
    Then the Reviewer sees what the tree shows, what the M, U and A letters and the specification mark mean, and that the tree writes only through its menu
