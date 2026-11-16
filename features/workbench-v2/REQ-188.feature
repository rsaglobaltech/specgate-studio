Feature: Split the editor right, left, down or up, five ways

  @REQ-188 @SCN-560
  Scenario: REQ-031 left, its feature right, on the desktop
    Given sprich in the desktop app with REQ-031's spec open and `features/pedidos/REQ-031.feature` open in the same group
    When the Developer drags the tab of `REQ-031.feature` to the right edge of the group, sees the overlay over its right half, and drops it
    Then the Developer sees REQ-031's spec in the left group and `REQ-031.feature` in a new right group, each with its own tab strip

  @REQ-188 @SCN-561
  Scenario: Ctrl+\ and Ctrl+K then Down, in the browser
    Given sprich in the browser on Windows with `spec.md` open in one group
    When the Developer presses Ctrl+\, then Ctrl+K followed by the down arrow
    Then the Developer sees three groups: the first on the left, a second on the right, and a third under the second, each showing `spec.md`

  @REQ-188 @SCN-562
  Scenario: From the tab's menu and the palette, on the desktop
    Given sprich in the desktop app with `docs/brief.md` open
    When the Developer chooses "Split Up" in its tab's menu, then "Split Editor Left" in the palette
    Then the Developer sees `docs/brief.md` in a group above the first and in a group left of the active one
