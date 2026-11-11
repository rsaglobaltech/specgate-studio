Feature: An opened folder is told empty, code, or a specgate project

  @REQ-021 @SCN-061
  Scenario: sprich opened on the desktop is a specgate project
    Given the folder `sprich`, which holds `docs/specs/traceability.md`
    When the Developer opens it in the desktop app
    Then the Developer sees "Specgate project" for sprich, and its Home

  @REQ-021 @SCN-062
  Scenario: An empty folder opened in the browser
    Given the folder `nuevo`, which holds nothing but `.git`
    When the Developer opens it in the browser
    Then the Developer sees "Empty folder", and no specgate command was run for it
