Feature: The preview names the settings adoption saves

  @REQ-113 @SCN-335
  Scenario: shop's test command and agent in the desktop preview
    Given the desktop app on `~/projects/shop`, whose `package.json` has a `test` script, on a machine with Claude Code installed
    When the Developer opens Adopt
    Then the preview shows `harness.config.yaml` with `test_cmd: npm test` and the Claude Code agent, beside the files

  @REQ-113 @SCN-336
  Scenario: A project with no test yet, in the browser preview
    Given `~/projects/shop` with code and no test file nor `test` script, open in the browser
    When the Developer opens Adopt
    Then the preview says no test command will be saved because no test was found yet, and how to set one later
