Feature: The client's text proposes the form; nothing is saved until accepted

  @REQ-074 @SCN-218
  Scenario: The proposal accepted on the desktop
    Given sprich open in the desktop app, an agent set, and the client's text of the pedidos call
    When the Developer pastes it into "Paste the client's text", reviews the proposed form, and presses "Accept"
    Then `docs/brief.md` has the proposed modules, rules and examples, and before "Accept" the file had not changed

  @REQ-074 @SCN-219
  Scenario: The proposal discarded in the browser
    Given sprich open in the browser, the agent's proposed form shown for the pasted text
    When the Developer presses "Discard"
    Then `docs/brief.md` is unchanged byte for byte, and no file of sprich was written
