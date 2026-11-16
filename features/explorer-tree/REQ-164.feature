Feature: The active editor's file revealed in the tree

  @REQ-164 @SCN-488
  Scenario: A spec opened from the palette is revealed, on the desktop
    Given sprich in the desktop app with every folder of the tree closed
    When the Developer opens `docs/specs/changes/draft-pedidos/specs/pedidos/spec.md` from the palette
    Then the Developer sees `docs`, `specs`, `changes`, `draft-pedidos`, `specs` and `pedidos` open, that `spec.md` selected and in view, and the cursor still in the editor

  @REQ-164 @SCN-489
  Scenario: Switching tabs moves the selection, in the browser
    Given sprich in the browser with `spec.md` and `docs/brief.md` open in tabs, `spec.md` active
    When the Developer chooses the tab of `docs/brief.md`
    Then the Developer sees `docs/brief.md` selected in the tree and `spec.md` no longer selected
