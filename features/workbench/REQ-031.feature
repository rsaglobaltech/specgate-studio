Feature: The same activity bar on every screen

  @REQ-031 @SCN-091
  Scenario: Changes open in the desktop app
    Given the desktop app with sprich open on Home
    When the Developer opens Changes from the activity bar
    Then the activity bar shows Home, Explorer, Brief, Changes, Questions, Build, Live, Traceability, Report at the top and Help, Settings at the bottom, in that order, with Changes marked as the open view

  @REQ-031 @SCN-092
  Scenario: Report open in the browser
    Given `specgate-studio serve` for sprich open in the browser on Home
    When the Developer opens Report from the activity bar
    Then the activity bar shows the same eleven views in the same order as on Home, with Report marked as the open view
