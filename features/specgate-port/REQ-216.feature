Feature: A build specgate refused says its code and its fix

  @REQ-216 @SCN-965
  Scenario: REQ-030 skipped, its change not approved, on the desktop
    Given sprich on specgate 1.0 in the desktop app, draft-pedidos waiting for its tasks' approval
    When the Developer builds REQ-030
    Then the Developer sees the build end with "harness_not_approved: draft-pedidos waits for tasks (developer)." and the fix `specgate change approve draft-pedidos --layer tasks`
