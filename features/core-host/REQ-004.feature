Feature: A section's data in under 50 ms after the first read

  @REQ-004 @SCN-007
  Scenario: Changes on the desktop
    Given sprich read once in the desktop app
    When the Developer opens Changes
    Then the Developer sees the list of changes in under 50 ms, answered by `section.get` for `changes`

  @REQ-004 @SCN-008
  Scenario: Questions in the browser
    Given sprich read once by `specgate-studio serve`
    When the Developer opens Questions in the browser
    Then the Developer sees the open questions in under 50 ms, answered by `section.get` for `questions`
