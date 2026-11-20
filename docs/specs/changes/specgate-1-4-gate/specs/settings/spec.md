# Delta — settings

## MODIFIED Requirements

### Requirement: REQ-143 — The sections: agents and profiles, preferences, agent guards, quality, gate, ALM, editor, terminal, shortcuts, appearance

The system SHALL group Settings in ten sections, in this order — Agents and profiles, Preferences, Agent guards, Quality, Gate, ALM, Editor, Terminal, Shortcuts, Appearance — each setting under one scope; every project setting of every section SHALL be saved through `specgate config set`, the studio never editing specgate's files itself; it SHALL show where a credential comes from, by the name of its environment variable, and never its value.

> Brief: "Agents and profiles, preferences, agent guards, quality, ALM, editor, terminal, shortcuts, appearance." Gate added after Quality by specgate-1-4-gate REQ-223 (issue #39).

#### Scenario: SCN-425 — The ten sections, on the desktop

- GIVEN sprich open in the desktop app, its profiles `claude-sonnet` and `claude-opus` in `.harness/profiles.yaml`
- WHEN the Developer opens Settings
- THEN the Developer sees the ten sections in that order, and under Agents and profiles the agent set in `harness.config.yaml` and the profiles `claude-sonnet` and `claude-opus`

#### Scenario: SCN-426 — ALM names the token's variable, never its value, in the browser

- GIVEN sprich open in the browser, its `alm.config.yaml` with the provider jira and `token_env: JIRA_API_TOKEN`, that variable set
- WHEN the Developer opens the section ALM
- THEN the Developer sees the provider jira and that the token comes from `JIRA_API_TOKEN`, set, and no part of the token's value

#### Scenario: SCN-427 — Agent guards, on the desktop

- GIVEN sprich open in the desktop app, its agent guards on
- WHEN the Developer opens the section Agent guards
- THEN the Developer sees Agent guards on, beside `specgate config set agent_guard off` and `.specgate/config.json`, and the "?" that explains what the guards refuse

#### Scenario: SCN-428 — Quality saved through specgate, in the browser

- GIVEN sprich open in the browser, its quality checks at the level basic
- WHEN the Developer sets Quality to strict and saves
- THEN the setting showed its `specgate config set` command and `harness.config.yaml` before saving, and the notice names that command, that file and the next step `specgate check`

<!-- specgate:trace status=Implemented feature=features/settings/REQ-143.feature actor=Developer kind=functional -->
