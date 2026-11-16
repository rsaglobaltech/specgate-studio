Feature: A frame with its bottom panel always there: the menu bar, the gate pill in its colour, a primary Build, and a status bar of the open view

  @REQ-172 @SCN-513
  Scenario: Questions with nothing open, on the desktop
    Given sprich in the desktop app with no file open and no terminal, Q1 and Q2 open and Q4 to confirm
    When the Developer opens Questions
    Then the Developer sees no tab strip, the bottom panel with its five tabs, and the status bar reading "2 open · 1 to confirm"

  @REQ-172 @SCN-514
  Scenario: The header after a green gate, in the browser
    Given sprich in the browser, its last gate passed
    When the Developer opens Home and chooses Terminal in the menu bar, then "New terminal"
    Then the Developer sees the menu bar File, Spec, Build, Terminal, Help, the pill "Gate green" in green, the primary "Build", and a new terminal in the bottom panel
