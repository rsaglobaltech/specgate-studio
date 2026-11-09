Feature: One write command at a time

  @REQ-006 @SCN-011
  Scenario: Archive while apply runs, on the desktop
    Given `specgate apply REQ-007` running from the desktop app
    When the Developer taps Archive on `add-coupons`
    Then the Developer sees it refused with `write_busy`, the message naming `specgate apply REQ-007`, and nothing is archived

  @REQ-006 @SCN-012
  Scenario: A second tab tries to write, in the browser
    Given `specgate apply REQ-007` running, started from one browser tab
    When the Developer taps Save on a preference in a second tab
    Then the Developer sees it refused with `write_busy` naming `specgate apply REQ-007`, and the preference is not written
