Feature: One row per scenario: requirement, feature, test, code, status

  @REQ-121 @SCN-361
  Scenario: SCN-020b shows as a gap, on the desktop
    Given sprich open in the desktop app, its requirement REQ-020 with the scenarios SCN-020a and SCN-020b in `features/pagos/REQ-020.feature`, and a test that names SCN-020a only
    When the Reviewer opens Traceability
    Then the Reviewer sees two rows for REQ-020: SCN-020a with its feature, its test, its code and the status Approved; and SCN-020b with its feature, no test, and marked as a gap

  @REQ-121 @SCN-362
  Scenario: The same rows in the browser
    Given the same sprich served by `specgate-studio serve`
    When the Reviewer opens Traceability in the browser
    Then the Reviewer sees the same rows as on the desktop, SCN-020b marked as a gap
