Feature: Home does not count the baseline of adopted code as work to do

  @REQ-230 @SCN-1006
  Scenario: shop just adopted, on the desktop
    Given `~/projects/shop` just adopted in the desktop app with specgate 1.4, `specgate status --json` listing only REQ-001 "Preserve existing behaviour", pending
    When the Developer opens Home
    Then the counters show 0 requirements and 0 to do, and below them that the baseline of the existing code is closed by a test that names REQ-001

  @REQ-230 @SCN-1007
  Scenario: An empty folder's baseline counts, in the browser
    Given `~/projects/notes` adopted in the browser with no code, `specgate status --json` listing REQ-001 "Build and test the project", pending
    When the Developer opens Home
    Then the counters show 1 requirement and 1 to do
