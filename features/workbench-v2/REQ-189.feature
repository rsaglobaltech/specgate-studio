Feature: Editor groups: their own tabs, one file in sync, moved tabs, focus and splitters

  @REQ-189 @SCN-563
  Scenario: One spec in two groups, on the desktop
    Given sprich in the desktop app with REQ-031's spec open in the left and the right group
    When the Developer types in the left group
    Then the Developer sees the same text appear in the right group, both tabs marked unsaved, and one save writes the file once

  @REQ-189 @SCN-564
  Scenario: The last tab closed, in the browser
    Given sprich in the browser with two groups, the right one holding only `REQ-031.feature`
    When the Developer closes `REQ-031.feature`
    Then the Developer sees one group, filling the editor area

  @REQ-189 @SCN-565
  Scenario: Focus and the splitter, on the desktop
    Given sprich in the desktop app with two groups, the left one 70 % wide
    When the Developer presses Ctrl/Cmd+2, then double-clicks the splitter between them
    Then the Developer sees the right group active, then both groups 50 % wide
