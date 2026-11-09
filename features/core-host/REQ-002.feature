Feature: The project's state kept in memory after the first read

  @REQ-002 @SCN-003
  Scenario: Home again, from memory, on the desktop
    Given the desktop app has read sprich once, and that first `status` took 1.9 s
    When the Developer opens Home again
    Then Home's data comes back in 20 ms and no specgate process is started

  @REQ-002 @SCN-004
  Scenario: A reload in the browser does not read the project again
    Given sprich read once by `specgate-studio serve`
    When the Developer reloads the browser tab
    Then the page shows sprich's state again and the host starts no specgate process
