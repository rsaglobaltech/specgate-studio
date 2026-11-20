Feature: Home says the policy in force beside the gate's result

  @REQ-226 @SCN-1000
  Scenario: standard with coverage reported, on the desktop
    Given sprich in the desktop app, its `.specgate/gate.yaml` saying `preset: standard`, `coverage: warning` and every other rule error
    When the Developer opens Home
    Then the Developer sees "Policy: standard · coverage warning" beside the gate's result

  @REQ-226 @SCN-1001
  Scenario: No policy file, in the browser
    Given sprich in the browser with no `.specgate/gate.yaml`
    When the Developer opens Home
    Then Home shows the gate's result with no policy line
