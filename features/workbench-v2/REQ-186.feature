Feature: The whole project under its root: dot folders included, ignored ones dimmed

  @REQ-186 @SCN-552
  Scenario: sprich's root, on the desktop
    Given sprich in the desktop app, with `.claude`, `.github`, `.idea` and `node_modules` in its folder and `.idea/` named in `.gitignore`
    When the Developer chooses Explorer
    Then the Developer sees under the spec explorer and the modules the root "SPRICH" with `.claude`, `.github`, `.idea`, `node_modules` and the rest, `.idea` and `node_modules` dimmed

  @REQ-186 @SCN-553
  Scenario: node_modules opened, in the browser
    Given sprich in the browser with `node_modules` dimmed and closed
    When the Developer opens `node_modules`
    Then the Developer sees its folders, dimmed, read only now
