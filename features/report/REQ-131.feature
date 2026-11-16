Feature: Built of the total, scenarios proven, coverage, mutation score, cost and time

  @REQ-131 @SCN-391
  Scenario: pagos is 2 of 6, on the desktop
    Given sprich open in the desktop app, its module pagos with 6 requirements of which 2 are Implemented, the harness's diff coverage of pagos at 74 %, no line coverage of the project measured, and the cost of its builds measured from the agent's tokens
    When the Reviewer opens Report and chooses pagos
    Then the Reviewer sees pagos built 2 of 6, the scenarios proven of its total, diff coverage 74 % labelled as the harness's, line coverage not measured, its mutation score, its cost labelled measured, and its time

  @REQ-131 @SCN-392
  Scenario: No mutation score yet, in the browser
    Given sprich open in the browser, no quality check that measures mutation configured
    When the Reviewer opens Report
    Then the Reviewer sees the mutation score as not measured, with the command that sets the checks up, `specgate quality init --level strict`, and no 0 %

  @REQ-131 @SCN-397
  Scenario: Only an estimate of the cost, in the browser
    Given sprich open in the browser, its builds run by an agent whose cost specgate did not measure, and the profile `claude-sonnet` declaring a cost per run
    When the Reviewer opens Report
    Then the Reviewer sees the cost labelled estimated, from the profile `claude-sonnet`, and no measured cost
