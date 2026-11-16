Feature: A specgate workspace opens as its repositories

  @REQ-218 @SCN-981
  Scenario: truck's workspace, on the desktop
    Given truck-workspace made by `specgate workspace init --name truck` beside truck-fleet and truck-web, in the desktop app
    When the Developer opens truck-workspace
    Then the Developer sees truck with fleet · service and web · web, each with its requirements done of its total, and no offer to adopt the folder

  @REQ-218 @SCN-982
  Scenario: Open fleet, in the browser
    Given truck-workspace open in the browser
    When the Developer presses "Open fleet"
    Then the Developer sees truck-fleet open as a specgate project in a host of its own
