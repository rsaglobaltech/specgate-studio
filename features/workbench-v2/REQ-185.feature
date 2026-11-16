Feature: No folder open: "No folder opened", "Open Folder" and "Clone Repository"

  @REQ-185 @SCN-550
  Scenario: The studio opens with no folder, on the desktop
    Given the desktop app started with no folder
    When the Developer chooses Explorer
    Then the Developer sees "No folder opened", "You have not yet opened a folder.", "Open Folder", "Clone Repository" and the line saying a repository is cloned into a folder and opened

  @REQ-185 @SCN-551
  Scenario: Open Folder opens sprich, in the browser
    Given the studio in the browser with no folder open
    When the Developer presses "Open Folder" and chooses `~/mvp/sprich-platform/sprich`
    Then the Developer sees sprich's Explorer with its root "sprich" and sprich's Home

  @REQ-185 @SCN-572
  Scenario: Clone Repository with the GitHub CLI, on the desktop
    Given the desktop app with no folder open and the GitHub CLI signed in
    When the Developer presses "Clone Repository", gives `rsaglobaltech/sprich` and chooses `~/mvp`
    Then the Developer sees `gh repo clone rsaglobaltech/sprich` run in the terminal into `~/mvp/sprich`, then sprich opened
