Feature: "Draft the modules" fixes a draft with findings, and shows each module as it goes

  @REQ-241 @SCN-1018
  Scenario: A draft fixed on the second pass, in the browser
    Given sprich in the browser with the modules pedidos and pagos to draft, and an agent whose first draft of pedidos has one finding and whose second has none
    When the Developer presses "Draft the modules"
    Then pedidos shows as being fixed (pass 1 of 2) and then ready to review, pagos is drafted after it, and the panel ends with 2 of 2 modules done

  @REQ-241 @SCN-1019
  Scenario: A draft still with findings after two passes, on the desktop
    Given sprich on the desktop, and an agent whose drafts of pedidos keep one finding
    When the Developer presses "Draft the modules"
    Then pedidos is drafted once and fixed twice, then shows as stopped with 1 finding and "See it in Changes"; pagos shows as still to come and was not drafted
