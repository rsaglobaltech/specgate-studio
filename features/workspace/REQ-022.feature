Feature: The watcher ignores dependencies, git and build output

  @REQ-022 @SCN-063
  Scenario: A dependency installed on the desktop changes nothing
    Given sprich open in the desktop app
    When the Developer runs `npm install` in its terminal and it writes under `node_modules`
    Then the Developer sees no file of `node_modules` in the Explorer and the uncommitted files unchanged

  @REQ-022 @SCN-064
  Scenario: A build in the browser changes nothing
    Given sprich open in the browser
    When the Developer runs its build and it writes `apps/web/dist`
    Then the Developer sees no file of `apps/web/dist` in the Explorer, and no section of the project was read again
