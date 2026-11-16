Feature: No overlap, no dead column, no sideways scroll, at 1440×900 and 1280×800

  @REQ-202 @SCN-604
  Scenario: Live's module map inside its column, on the desktop at 1280×800
    Given the desktop app at 1280×800 px building REQ-141, with 14 modules on Live's left
    When the Developer opens Live
    Then the Developer sees the module map scrolling inside its own column, the steps and SALIDA DEL AGENTE whole in the centre, and no control drawn over another

  @REQ-202 @SCN-605
  Scenario: Build with the side bar narrowed and the agent panel closed, in the browser at 1440×900
    Given the browser at 1440×900 px showing Build, with 10 uncommitted files waiting and the agent panel open
    When the Developer narrows the side bar to its minimum, then closes the agent panel
    Then the Developer sees the side bar's list with no horizontal scroll, and the content growing into the agent panel's room with no empty column left
