Feature: The Help view: every "?" explanation, searchable, in English and Spanish

  @REQ-179 @SCN-531
  Scenario: Searching "archive", on the desktop
    Given the Reviewer in sprich in the desktop app, in English
    When the Reviewer opens Help and types "archive"
    Then the Reviewer sees "Archive a change" with its command `specgate archive` and its five parts, and no feature that does not mention it

  @REQ-179 @SCN-532
  Scenario: The same catalogue in Spanish, in the browser
    Given the Reviewer in sprich in the browser, in Spanish
    When the Reviewer opens Help
    Then the Reviewer sees the features grouped by area, each with its explanation in Spanish under "[ POR DEBAJO ]"
