Feature: The uncommitted files, grouped by folder

  @REQ-025 @SCN-069
  Scenario: sprich's 325 uncommitted files on the desktop
    Given sprich with 325 uncommitted files, 129 under `packages/core`, 96 under `apps/web` and 84 of the specification
    When the Developer opens the uncommitted files in the desktop app
    Then the Developer sees 325 files, with the groups `packages/core` 129, `apps/web` 96 and the specification 84

  @REQ-025 @SCN-070
  Scenario: The same groups in the browser
    Given sprich with 325 uncommitted files, 129 under `packages/core`, 96 under `apps/web` and 84 of the specification
    When the Developer opens the uncommitted files in the browser
    Then the Developer sees the same 325 files and the same three groups and counts
