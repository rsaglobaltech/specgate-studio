Feature: The editor loads when the first file opens, not before

  @REQ-041 @SCN-121
  Scenario: sprich's Home on the desktop, then its first file
    Given the desktop app has opened sprich and shows Home, and no file has been opened yet
    When the Developer opens `docs/specs/changes/draft-pedidos/specs/pedidos/spec.md` from the Explorer
    Then the editor's code is loaded at that moment and the file is shown in it, and until then the app had not loaded the editor's code

  @REQ-041 @SCN-122
  Scenario: Questions in the browser, without the editor
    Given `specgate-studio serve` for sprich on `http://127.0.0.1:4180`
    When the Developer opens that address and then Questions
    Then Home and Questions are shown and the browser has not downloaded the editor's code, which it downloads only when the Developer opens a file
