Feature: A settings editor with search, and two scopes: project and user

  @REQ-141 @SCN-421
  Scenario: Searching "test", on the desktop
    Given sprich open in the desktop app, its test command `npm test`
    When the Developer opens Settings and types "test" in the search box
    Then the Developer sees the setting Test command under Project with the value `npm test`, and no setting whose name or description lacks "test"

  @REQ-141 @SCN-422
  Scenario: A user setting stays out of the project, in the browser
    Given sprich open in the browser, the theme dark
    When the Developer chooses the User scope and sets the theme to light
    Then the studio turns light, the notice names the user settings file it wrote, and no file of sprich has changed
