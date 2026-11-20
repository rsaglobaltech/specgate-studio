Feature: The gate's policy in Settings: preset, rules and the date

  @REQ-223 @SCN-993
  Scenario: Coverage raised to error, on the desktop
    Given sprich in the desktop app, its `.specgate/gate.yaml` saying `preset: standard` and `coverage: warning`
    When the Developer opens Settings, then Gate, and sets coverage to error
    Then the studio runs `specgate config set gate.rules.coverage error`, the row reads error, and `.specgate/gate.yaml` says `coverage: error`

  @REQ-223 @SCN-994
  Scenario: A date that is no date, in the browser
    Given sprich in the browser, Settings open on Gate
    When the Developer writes `next month` as the date the gate enforces from
    Then the row shows specgate's refusal `config_value_invalid` with its fix, and `.specgate/gate.yaml` is unchanged

  @REQ-223 @SCN-995
  Scenario: No policy file, in the browser
    Given sprich in the browser with no `.specgate/gate.yaml`
    When the Developer opens Settings, then Gate
    Then the preset reads strict as its default, every rule reads error as its default, and no date is set
