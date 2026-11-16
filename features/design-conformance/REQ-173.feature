Feature: Home leads with the next step, four counters, the route, the modules and the activity

  @REQ-173 @SCN-515
  Scenario: sprich's Home with two questions open, on the desktop
    Given sprich in the desktop app, with Q1 and Q2 of draft-pedidos open and blocking REQ-031 and REQ-034, 24 requirements, 15 built and 12 proven
    When the Developer opens Home
    Then the Developer sees "Answer 2 questions of the draft pedidos" with the reason that they block REQ-031 and REQ-034, "Answer now" and its "?"; the counters 24, 15, 12 and the agent's cost; the route at "Questions answered · 2 open"; pedidos among the modules; and the actions Check the gate, Doctor, New change, From a ticket, Open terminal

  @REQ-173 @SCN-516
  Scenario: "Answer now" leads to the question, in the browser
    Given sprich's Home in the browser, its next step "Answer 2 questions of the draft pedidos"
    When the Developer presses "Answer now"
    Then the Developer sees Questions with Q1 of draft-pedidos selected
