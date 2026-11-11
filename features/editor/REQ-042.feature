Feature: Build, Check, Trace, Ask for a change and "?" above each requirement

  @REQ-042 @SCN-123
  Scenario: The actions above REQ-031 on the desktop
    Given the desktop app with sprich open
    When the Developer opens `docs/specs/changes/draft-pedidos/specs/pedidos/spec.md`
    Then above the heading of REQ-031 the Developer sees Build, Check, Trace, Ask for a change and "?", in that order, and the same five above every other requirement of the file

  @REQ-042 @SCN-124
  Scenario: Check from above REQ-031 in the browser
    Given the browser with sprich open and `docs/specs/changes/draft-pedidos/specs/pedidos/spec.md` in the editor
    When the Developer clicks Check above REQ-031
    Then `specgate check` runs, the terminal shows that command, and the action's notice names the command and how it ended
