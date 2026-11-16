Feature: Lost connection, loading, unreadable sections and failed actions say so

  @REQ-178 @SCN-527
  Scenario: The host stops and comes back, on the desktop
    Given sprich's Home in the desktop app
    When its host stops, and starts again
    Then the Developer sees "Reconnecting to the studio…" in a banner and the status bar grey while it is stopped, and once it is back the banner gone, the status bar orange and Home read again

  @REQ-178 @SCN-528
  Scenario: Traceability cannot be read, in the browser
    Given sprich in the browser, its `docs/specs/traceability.md` with a row of 5 columns instead of 10 at line 48
    When the Developer opens Traceability
    Then the Developer sees "[ COULD NOT READ ]" naming `traceability.md` and line 48, "Read again" and "Open line 48", and Home, Questions and Build still working

  @REQ-178 @SCN-529
  Scenario: An archive refused stays, on the desktop
    Given sprich in the desktop app, draft-pedidos with REQ-031 still Draft
    When the Developer archives draft-pedidos
    Then the Developer sees the notice "draft-pedidos was not archived" with its reason and "Retry", still there until the Developer closes it

  @REQ-178 @SCN-530
  Scenario: A slow first read shows the shape, in the browser
    Given sprich in the browser on its first read, the traceability section taking 2 s to read
    When the Developer opens Traceability
    Then the Developer sees "[ LOADING ]" and grey bars in the shape of the table until the rows come, never a blank page
