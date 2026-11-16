Feature: Archive runs only after its preview

  @REQ-085 @SCN-249
  Scenario: Archiving fix-rounding on the desktop
    Given `fix-rounding` under "Ready to archive"
    When the Developer clicks Archive in the desktop app, reads the preview and confirms
    Then `specgate archive fix-rounding --dry-run` ran first and its preview showed, then `specgate archive fix-rounding` ran, and the notice names what it wrote

  @REQ-085 @SCN-250
  Scenario: A change still in progress in the browser
    Given `add-coupons` with one requirement still to apply
    When the Developer opens it in Changes in the browser
    Then no Archive action is offered, and the change says which requirement is still to apply
