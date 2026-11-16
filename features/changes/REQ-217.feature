Feature: Each layer approved from Changes

  @REQ-217 @SCN-971
  Scenario: Ana approves discover, on the desktop
    Given sprich on specgate 1.0 in the desktop app, git naming Ana, draft-pedidos with its discover written and not approved
    When Ana presses "Approve discover" beside draft-pedidos' discover in Changes
    Then Ana sees the notice "approved the discover layer of draft-pedidos" naming `docs/specs/changes/draft-pedidos/approvals.json`, and discover · product · approved

  @REQ-217 @SCN-972
  Scenario: A layer not written yet, in the browser
    Given sprich on specgate 1.0 in the browser, draft-pedidos with no design.md written
    When the Developer asks to approve its design
    Then the Developer sees the notice refused with `approve_layer_missing` and the fix "Write design.md, then approve it.", and nothing written
