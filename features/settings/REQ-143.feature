Feature: The sections: agents and profiles, preferences, agent guards, quality, gate, ALM, editor, terminal, shortcuts, appearance

  @REQ-143 @SCN-425
  Scenario: The ten sections, on the desktop
    Given sprich open in the desktop app, its profiles `claude-sonnet` and `claude-opus` in `.harness/profiles.yaml`
    When the Developer opens Settings
    Then the Developer sees the ten sections in that order, and under Agents and profiles the agent set in `harness.config.yaml` and the profiles `claude-sonnet` and `claude-opus`

  @REQ-143 @SCN-426
  Scenario: ALM names the token's variable, never its value, in the browser
    Given sprich open in the browser, its `alm.config.yaml` with the provider jira and `token_env: JIRA_API_TOKEN`, that variable set
    When the Developer opens the section ALM
    Then the Developer sees the provider jira and that the token comes from `JIRA_API_TOKEN`, set, and no part of the token's value

  @REQ-143 @SCN-427
  Scenario: Agent guards, on the desktop
    Given sprich open in the desktop app, its agent guards on
    When the Developer opens the section Agent guards
    Then the Developer sees Agent guards on, beside `specgate config set agent_guard off` and `.specgate/config.json`, and the "?" that explains what the guards refuse

  @REQ-143 @SCN-428
  Scenario: Quality saved through specgate, in the browser
    Given sprich open in the browser, its quality checks at the level basic
    When the Developer sets Quality to strict and saves
    Then the setting showed its `specgate config set` command and `harness.config.yaml` before saving, and the notice names that command, that file and the next step `specgate check`
