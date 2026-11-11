Feature: Every open question in one place, with what it blocks

  @REQ-091 @SCN-271
  Scenario: Q1 listed with what it blocks, on the desktop
    Given sprich open in the desktop app, its draft `draft-pedidos` asking Q1, which blocks REQ-034
    When the Reviewer opens Questions
    Then the Reviewer sees Q1 with its text, the change `draft-pedidos` it was asked in, and REQ-034 as the requirement it blocks

  @REQ-091 @SCN-272
  Scenario: A question the agent asked while it builds, in the browser
    Given sprich open in the browser, and the agent building REQ-034 has asked a question about it with `specgate ask`
    When the Reviewer opens Questions
    Then the Reviewer sees that question beside Q1, marked as asked by the agent while it builds, with REQ-034 as the requirement it blocks
