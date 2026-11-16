Feature: The side panel of the boards, with file-type icons and the specification marked

  @REQ-162 @SCN-484
  Scenario: The Explorer of sprich, on the desktop
    Given sprich open in the desktop app, `spec.md` open in the editor
    When the Developer chooses Explorer in the activity bar
    Then the Developer sees the side panel titled "EXPLORER" with its "?", `spec.md`, `docs/specs` and `features` with the specification mark, `package.json` with the JSON icon, and `spec.md`, the current row, with the orange inset

  @REQ-162 @SCN-485
  Scenario: The same panel in Spanish, in the browser
    Given sprich in the browser with the studio in Spanish
    When the Developer opens `features` in the tree
    Then the Developer sees the header "EXPLORADOR", `features/pedidos` with the specification mark, and `features/pedidos/REQ-031.feature` with the feature icon
