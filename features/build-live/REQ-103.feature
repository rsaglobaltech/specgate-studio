Feature: Live shows each step, the agent's output, the queue, cost and tokens

  @REQ-103 @SCN-305
  Scenario: Live during the build of REQ-030 on the desktop
    Given the desktop app building REQ-030 with REQ-032 queued after it
    When the Developer opens Live
    Then the Developer sees REQ-030's finished steps with their times and the current step running, the agent's output growing as it writes, REQ-032 in the queue, and the cost and tokens so far

  @REQ-103 @SCN-306
  Scenario: Live opened in a second browser tab mid-build
    Given a build of REQ-030 started in one browser tab
    When the Developer opens Live in a second tab
    Then the Developer sees the same steps, the agent's output so far and from then on, the queue, cost and tokens
