Feature: Splitters by keyboard, the right roles, and a "?" with notices for every split

  @REQ-192 @SCN-570
  Scenario: The Reviewer resizes by keyboard, on the desktop
    Given the Reviewer in sprich in the desktop app with two editor groups
    When the Reviewer tabs to the splitter between them and presses the right arrow three times
    Then the Reviewer sees the left group wider by three steps, and a screen reader hears a separator with its new value

  @REQ-192 @SCN-571
  Scenario: The "?" of Split Editor Right in Spanish, in the browser
    Given the Reviewer in sprich in the browser in Spanish
    When the Reviewer presses the "?" beside "Dividir el editor a la derecha" in the tab's menu
    Then the Reviewer sees under "[ POR DEBAJO ]" that it opens the file in a new group on the right, writes no file and runs no command
