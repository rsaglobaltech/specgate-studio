Feature: Findings the policy reports, apart from those that fail

  @REQ-224 @SCN-996
  Scenario: Two untested scenarios under coverage: warning, on the desktop
    Given sprich in the desktop app, `coverage: warning` in its policy, and two scenarios no test names
    When the Developer runs Check from Home
    Then the gate reads passed, and Problems lists the two findings under "Reported, not failed" with coverage, the reason `.specgate/gate.yaml sets coverage to warning` and the fix `set coverage: error … once they are`

  @REQ-224 @SCN-997
  Scenario: One failure and one reported finding, in the browser
    Given sprich in the browser, `coverage: warning` in its policy, one untested scenario and one path the matrix declares that does not exist
    When the Developer runs Check from Home
    Then the gate reads failed, Problems lists the missing path among the failures and the untested scenario under "Reported, not failed" with coverage
