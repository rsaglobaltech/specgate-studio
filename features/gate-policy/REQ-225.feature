Feature: A policy specgate cannot read is shown with each fix

  @REQ-225 @SCN-998
  Scenario: preset: lax, on the desktop
    Given sprich in the desktop app, its `.specgate/gate.yaml` saying `preset: lax`
    When the Developer runs Check from Home
    Then Home and Problems show that `.specgate/gate.yaml` cannot be read, that preset `lax` is not one of minimal, standard, strict, and the fix "Use preset: minimal, standard or strict"

  @REQ-225 @SCN-999
  Scenario: The policy opened from its finding, in the browser
    Given sprich in the browser, Problems showing `gate_policy_invalid`
    When the Developer opens the finding's file
    Then `.specgate/gate.yaml` opens in the editor
