Feature: One contract test suite for every adapter

  @REQ-015 @SCN-039
  Scenario: The same Questions from either adapter, on the desktop
    Given sprich, read once through the CLI adapter and once through the fake loaded with the CLI adapter's answers
    When the Developer opens Questions with each
    Then the Developer sees the same questions, in the same order, from both

  @REQ-015 @SCN-040
  Scenario: An adapter that breaks the contract is not used, in the browser
    Given an adapter whose `questions` returns a question without the requirements it blocks
    When the Developer opens Questions in the browser
    Then the contract test `questions lists what each question blocks` fails for that adapter and the studio does not ship with it
