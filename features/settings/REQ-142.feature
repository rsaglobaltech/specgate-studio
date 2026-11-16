Feature: Each project setting says which `specgate config set` command saves it and where

  @REQ-142 @SCN-423
  Scenario: The test command saved as `pnpm test`, on the desktop
    Given sprich open in the desktop app, its test command `npm test`
    When the Developer sets Test command to `pnpm test` and saves
    Then the setting showed `specgate config set test_cmd "pnpm test"` and `harness.config.yaml` before saving; after it `harness.config.yaml` reads `test_cmd: "pnpm test"`, and the notice names that command, that file and the next step `specgate check`

  @REQ-142 @SCN-424
  Scenario: An agent without {prompt_file} refused, in the browser
    Given sprich open in the browser
    When the Developer sets Agent to `claude -p` and saves
    Then the Developer sees specgate's refusal `config_value_invalid` with its fix `specgate config set agent "claude -p < {prompt_file}"`, and `harness.config.yaml` is unchanged
