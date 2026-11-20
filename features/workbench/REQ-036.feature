Feature: Views switch in under 50 ms; 5,000 rows scroll at 60 fps

  @REQ-036 @SCN-101
  Scenario: From Home to Changes in the desktop app
    Given the desktop app with sprich open and read, on Home
    When the Developer opens Changes from the activity bar
    Then Changes shows in under 50 ms

  @REQ-036 @SCN-102
  Scenario: A matrix of 5,000 rows in the browser
    Given a project whose Traceability lists 5,000 rows, open in the browser
    When the Developer scrolls that list from its first row to its last
    Then it scrolls at 60 fps
