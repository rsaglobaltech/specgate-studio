Feature: A command palette that names each command

  @REQ-033 @SCN-095
  Scenario: Opening a change from a ticket in the desktop app
    Given the desktop app with sprich open on Home
    When the Developer types Ctrl+Shift+P, "ticket", Enter
    Then "Open a change from a ticket" opens

  @REQ-033 @SCN-096
  Scenario: The palette shows the command in the browser
    Given sprich open in the browser on macOS
    When the Developer presses Cmd+Shift+P and types "ticket"
    Then the palette lists "Open a change from a ticket" with the command it runs, `specgate propose --from-ticket <KEY>`, beside it
