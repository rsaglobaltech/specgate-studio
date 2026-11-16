Feature: A change's approval read layer by layer, as specgate 1.0 says it

  @REQ-214 @SCN-961
  Scenario: Tasks not approved yet, on the desktop
    Given sprich on specgate 1.0 in the desktop app, draft-pedidos with discover and design approved and tasks not, its `approved:` line still dated 2026-11-01
    When the Developer opens Changes, then Build
    Then the Developer sees draft-pedidos under "to review" with discover · product · approved, design · architect · approved and tasks · developer · waits for its approval, and REQ-030 in Build waiting for review

  @REQ-214 @SCN-962
  Scenario: A layer edited after its approval, in the browser
    Given sprich on specgate 1.0 in the browser, draft-pedidos' discover edited after Ana approved it
    When the Developer opens Changes
    Then the Developer sees discover · product · edited after its approval: approve it again, and the change under "to review"
