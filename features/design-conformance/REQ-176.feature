Feature: The "?" beside its button and the palette's explanation, under "[ UNDER THE HOOD ]"

  @REQ-176 @SCN-523
  Scenario: The "?" of "Ask for a change", on the desktop
    Given the Reviewer on draft-pedidos in Changes, in the desktop app
    When the Reviewer presses the "?" beside "Ask for a change"
    Then the Reviewer sees, opened under that "?", "[ UNDER THE HOOD ]" with what it does, the command `specgate change note`, what it writes, what it does not do and what comes after, each a label and its text, and Escape closes it

  @REQ-176 @SCN-524
  Scenario: The palette explains as the Reviewer moves, in the browser
    Given the Reviewer in sprich in the browser
    When the Reviewer opens the palette and types "ticket"
    Then the Reviewer sees "Open a change from a ticket" selected under the group "SPEC", and beside the list "[ UNDER THE HOOD ]" with the command `specgate propose --from-ticket`
