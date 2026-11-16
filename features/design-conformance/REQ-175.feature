Feature: Changes, Questions and Build list in a side panel; Live in three columns

  @REQ-175 @SCN-519
  Scenario: Questions grouped, on the desktop
    Given sprich in the desktop app with Q1 and Q2 open and Q4 answered and waiting to be confirmed
    When the Developer opens Questions
    Then the Developer sees the side panel "QUESTIONS" with "OPEN · 2", "TO CONFIRM IN THE SPEC · 1" and "FROM THE AGENT, WHILE IT BUILDS · 0", and Q1 selected and shown beside it with its options

  @REQ-175 @SCN-520
  Scenario: Build's ready and waiting, in the browser
    Given sprich in the browser with REQ-012 and REQ-021 ready, REQ-012 chosen, and REQ-031 waiting on Q2
    When the Developer opens Build
    Then the Developer sees the side panel with "READY · APPROVED, NO QUESTIONS" listing REQ-012 and REQ-021 with a checkbox and an estimate each, "WAITING · CANNOT BE CHOSEN YET" listing REQ-031 with Q2, "Build 1 requirement" at its foot, and REQ-012's five steps beside it

  @REQ-175 @SCN-521
  Scenario: Changes grouped, on the desktop
    Given sprich in the desktop app with draft-pedidos to review, add-coupons in progress and auth-reset ready to archive
    When the Developer opens Changes
    Then the Developer sees the side panel "CHANGES" with "+ New", draft-pedidos under "TO REVIEW", add-coupons under "IN PROGRESS", auth-reset under "READY TO ARCHIVE", and draft-pedidos selected and shown beside it

  @REQ-175 @SCN-522
  Scenario: Live in three columns, in the browser
    Given sprich in the browser while REQ-012 builds, REQ-013 and REQ-021 queued, the agent asking a question
    When the Developer opens Live
    Then the Developer sees the modules and the queue on the left, REQ-012's steps and output in the middle, and the agent's question under "NEEDS ATTENTION" with the finished requirements on the right
