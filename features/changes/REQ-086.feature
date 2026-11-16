Feature: Apply runs the gate for one requirement and says why it refuses

  @REQ-086 @SCN-251
  Scenario: Apply on REQ-031 refused on the desktop
    Given REQ-031 of `add-coupons` with no test that names it
    When the Developer clicks Apply on REQ-031 in the desktop app
    Then `specgate apply REQ-031` ran, the notice says it was refused with `apply_no_test`, that nothing was written, and the fix: write a test that names REQ-031

  @REQ-086 @SCN-252
  Scenario: Apply on REQ-030 in the browser
    Given REQ-030 of `add-coupons` with a test that names it and a passing gate
    When the Developer clicks Apply on REQ-030 in the browser
    Then `specgate apply REQ-030` ran, REQ-030 shows Implemented, and the notice names the files it wrote and the next step
