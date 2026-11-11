Feature: Every explanation in English and Spanish, or the tests fail

  @REQ-065 @SCN-189
  Scenario: The Spanish explanation, on the desktop
    Given the desktop app switched to Spanish
    When the Developer clicks the "?" beside Check
    Then the Developer sees the five parts of the explanation in Spanish

  @REQ-065 @SCN-190
  Scenario: The English explanation, in the browser
    Given the studio in the browser, in English
    When the Developer clicks the "?" beside Archive
    Then the Developer sees the five parts of the explanation in English

  @REQ-065 @SCN-191
  Scenario: An action with no Spanish explanation fails the tests
    Given the action Archive with an English explanation and no Spanish one
    When the Developer runs `npm test`
    Then the tests fail, naming the action `archive` and the language `es`
