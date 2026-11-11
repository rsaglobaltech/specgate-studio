Feature: The CLI adapter: specgate with --json, parsed

  @REQ-012 @SCN-033
  Scenario: Questions on the desktop, from `specgate questions --json`
    Given sprich open in the desktop app with the open question Q2 of draft-pedidos
    When the Developer opens Questions
    Then the Developer sees Q2 with the requirements it blocks, parsed from `specgate questions --json`

  @REQ-012 @SCN-034
  Scenario: A refused apply in the browser, with its finding
    Given sprich open in the browser and REQ-007 with no test that names it
    When the Developer taps Deliver on REQ-007
    Then the Developer sees `apply REQ-007` refused with the finding `apply_no_test` and its fix, from `specgate apply REQ-007 --json`
