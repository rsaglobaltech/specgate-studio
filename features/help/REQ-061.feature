Feature: A "?" beside every feature that acts, for the Developer

  @REQ-061 @SCN-181
  Scenario: The "?" beside Check, on the desktop
    Given sprich open in the desktop app, on Home
    When the Developer clicks the "?" beside Check
    Then the Developer sees what Check does, the command `specgate check`, that it changes no file, that it does not commit or push, and that next comes `specgate apply` for a requirement whose test passes — and no command was run

  @REQ-061 @SCN-182
  Scenario: The "?" beside Build, in the browser
    Given sprich open in the browser, on REQ-031 of draft-pedidos
    When the Developer clicks the "?" beside Build
    Then the Developer sees what Build does, the command `specgate harness run --req REQ-031`, the files it may change, that it does not push, and that next comes the gate on the branch it opens — and no command was run
