Feature: A command the port does not offer is refused before anything runs

  @REQ-016 @SCN-041
  Scenario: `init --force` asked from the desktop UI
    Given sprich open in the desktop app
    When the Developer's UI asks the host to run `init --force`
    Then the Developer sees it refused with `command_unknown` naming `init`, and no process was started

  @REQ-016 @SCN-042
  Scenario: `rm -rf .` asked from a browser tab
    Given sprich open in the browser
    When the Developer's tab asks the host to run `rm -rf .`
    Then the Developer sees it refused with `command_unknown` naming `rm -rf .`, and no process was started
