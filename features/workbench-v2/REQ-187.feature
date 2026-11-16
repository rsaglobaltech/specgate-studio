Feature: An icon for each kind of folder and file, as an icon theme

  @REQ-187 @SCN-554
  Scenario: sprich's root, its icons, on the desktop
    Given sprich in the desktop app with `docs`, `src`, `test`, `features`, `.github`, `node_modules`, `package.json`, `LICENSE`, `.gitignore` and `AGENTS.md`
    When the Developer chooses Explorer
    Then the Developer sees each with the icon of its kind, `docs` and `src` with their folder colours, and `docs` showing its open folder icon once opened

  @REQ-187 @SCN-555
  Scenario: A kind it does not know, in the browser
    Given sprich in the browser with a file `notes.xyz`
    When the Developer opens its folder
    Then the Developer sees `notes.xyz` with the generic file icon
