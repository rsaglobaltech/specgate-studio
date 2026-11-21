Feature: A draft that cannot be approved says why, and the agent can fix it

  @REQ-242 @SCN-1020
  Scenario: Two blockers shown, in the browser
    Given sprich in the browser, draft-pedidos waiting for its discover layer, and specgate saying two blockers for it, each with its fix
    When the Reviewer opens Changes
    Then draft-pedidos shows "Cannot be approved yet (2)" with both messages and fixes, its Approve button is disabled, and "Fix with the agent" is offered

  @REQ-242 @SCN-1021
  Scenario: Fix with the agent, on the desktop
    Given sprich on the desktop, draft-pedidos with one blocker, an agent set
    When the Reviewer presses "Fix with the agent"
    Then `specgate propose --from-brief pedidos --agent claude` runs, shown in the terminal and on the card while it runs
