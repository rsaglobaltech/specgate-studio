Feature: Changes grouped by what they wait for

  @REQ-081 @SCN-241
  Scenario: sprich's changes in the desktop app
    Given sprich with the draft `draft-pedidos` not yet approved, the change `add-coupons` with one requirement still to apply, and the change `fix-rounding` with every requirement applied
    When the Developer opens Changes in the desktop app
    Then they see "To review (1)" with `draft-pedidos`, "In progress (1)" with `add-coupons`, and "Ready to archive (1)" with `fix-rounding`

  @REQ-081 @SCN-242
  Scenario: A change moves group in the browser
    Given sprich open in the browser with `add-coupons` under "In progress"
    When its last requirement is applied and the Developer opens Changes again
    Then `add-coupons` is under "Ready to archive" and no longer under "In progress"
