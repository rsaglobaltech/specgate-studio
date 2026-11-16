Feature: Folders open one level at a time; 50,000 files stay under 50 ms; open folders kept per project

  @REQ-161 @SCN-481
  Scenario: Opening `packages/core` in sprich, on the desktop
    Given sprich, a project of 50,000 files outside the ignored folders, open in the desktop app, its tree showing only the top level
    When the Developer opens the folder `packages/core`
    Then the Developer sees its children under it in under 50 ms, folders first and then files, each by name, and the host has read no folder but `packages/core`

  @REQ-161 @SCN-482
  Scenario: The folders left open come back, in the browser
    Given sprich in the browser, with `packages/core` and `docs/specs` left open when it was last closed
    When the Developer opens sprich again
    Then the Developer sees `packages/core` and `docs/specs` open and every other folder closed

  @REQ-161 @SCN-483
  Scenario: Closing a folder, on the desktop
    Given sprich in the desktop app with `packages/core` open
    When the Developer closes `packages/core`
    Then the Developer sees its children gone and `packages/core` marked closed, and the next time sprich opens it is still closed
