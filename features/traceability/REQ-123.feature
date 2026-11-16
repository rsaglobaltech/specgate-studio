Feature: "Fix" opens the scenario and proposes the missing test, written only on confirmation

  @REQ-123 @SCN-366
  Scenario: "Fix" on SCN-020b, on the desktop
    Given sprich's Traceability open in the desktop app, SCN-020b shown as a gap
    When the Developer presses "Fix" on SCN-020b
    Then the editor opens `features/pagos/REQ-020.feature` at SCN-020b, the proposal shows the file `test/pagos/REQ-020.test.ts` and a skeleton that names REQ-020 and SCN-020b with one step per GIVEN, WHEN and THEN, no agent has run, and no file of sprich has changed

  @REQ-123 @SCN-367
  Scenario: The proposal confirmed, in the browser
    Given the proposed test for SCN-020b shown in the browser
    When the Developer confirms it
    Then `test/pagos/REQ-020.test.ts` is written, SCN-020b's row no longer says it has no test, and the notice names the file written and the next step `specgate apply REQ-020`

  @REQ-123 @SCN-368
  Scenario: The proposal cancelled, on the desktop
    Given the proposed test for SCN-020b shown in the desktop app
    When the Developer cancels it
    Then no file is written, SCN-020b is still a gap, and the notice says that nothing was written

  @REQ-123 @SCN-369
  Scenario: "Ask the agent" completes the skeleton, in the browser
    Given the skeleton proposed for SCN-020b shown in the browser, and the agent `claude` set in sprich's `harness.config.yaml`
    When the Developer presses "Ask the agent"
    Then the Developer sees the agent's completed test as a diff against the skeleton, with its cost, and `test/pagos/REQ-020.test.ts` is still not written until the Developer confirms
