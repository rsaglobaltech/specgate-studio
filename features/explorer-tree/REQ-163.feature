Feature: Git letters on files and a dot on folders holding a change

  @REQ-163 @SCN-486
  Scenario: A modified brief, an untracked note and an added file, on the desktop
    Given sprich in the desktop app with `docs/brief.md` modified, `docs/notes.md` untracked and `src/cart.ts` added to the index
    When the Developer opens the folder `docs`
    Then the Developer sees `docs/brief.md` with M in amber, `docs/notes.md` with U in green, a dot on `docs`, and a dot on the closed folder `src`

  @REQ-163 @SCN-487
  Scenario: The letters go once committed, in the browser
    Given sprich in the browser with `docs/brief.md` showing M and a dot on `docs`
    When the Developer commits `docs/brief.md` in the studio's terminal
    Then the Developer sees the M and the dot on `docs` gone within 500 ms of the commit, with no reload
