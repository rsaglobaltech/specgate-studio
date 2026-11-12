# Delta — settings

## ADDED Requirements

### Requirement: REQ-141 — A settings editor with search, and two scopes: project and user

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL open Settings as an editor with a search box and two scopes, Project and User: a project setting is saved in the open project's files and shared through git; a user setting is saved in the Developer's own settings file and applies to every project; the search SHALL keep, in both scopes, the settings whose name or description matches, in the studio's language.

> Brief: "A settings editor with search and two scopes: project and user."

#### Scenario: SCN-421 — Searching "test", on the desktop

- GIVEN sprich open in the desktop app, its test command `npm test`
- WHEN the Developer opens Settings and types "test" in the search box
- THEN the Developer sees the setting Test command under Project with the value `npm test`, and no setting whose name or description lacks "test"

#### Scenario: SCN-422 — A user setting stays out of the project, in the browser

- GIVEN sprich open in the browser, the theme dark
- WHEN the Developer chooses the User scope and sets the theme to light
- THEN the studio turns light, the notice names the user settings file it wrote, and no file of sprich has changed

### Requirement: REQ-142 — Each project setting says which `specgate config set` command saves it and where

<!-- specgate:trace actor=Developer kind=business-rule -->

The system SHALL show beside every project setting the `specgate config set` command that saves it and the file it is kept in, and SHALL save it only by running that command through specgate, with its arguments as an array; when specgate refuses a value, it SHALL show specgate's finding and fix and write nothing.

> Brief: "Each project setting says which `specgate config set` command saves it and where."

#### Scenario: SCN-423 — The test command saved as `pnpm test`, on the desktop

- GIVEN sprich open in the desktop app, its test command `npm test`
- WHEN the Developer sets Test command to `pnpm test` and saves
- THEN the setting showed `specgate config set test_cmd "pnpm test"` and `harness.config.yaml` before saving; after it `harness.config.yaml` reads `test_cmd: "pnpm test"`, and the notice names that command, that file and the next step `specgate check`

#### Scenario: SCN-424 — An agent without {prompt_file} refused, in the browser

- GIVEN sprich open in the browser
- WHEN the Developer sets Agent to `claude -p` and saves
- THEN the Developer sees specgate's refusal `config_value_invalid` with its fix `specgate config set agent "claude -p < {prompt_file}"`, and `harness.config.yaml` is unchanged

### Requirement: REQ-143 — The sections: agents and profiles, preferences, agent guards, quality, ALM, editor, terminal, shortcuts, appearance

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL group Settings in nine sections, in this order — Agents and profiles, Preferences, Agent guards, Quality, ALM, Editor, Terminal, Shortcuts, Appearance — each setting under one scope; every project setting of every section SHALL be saved through `specgate config set`, the studio never editing specgate's files itself; it SHALL show where a credential comes from, by the name of its environment variable, and never its value.

> Brief: "Agents and profiles, preferences, agent guards, quality, ALM, editor, terminal, shortcuts, appearance."

#### Scenario: SCN-425 — The nine sections, on the desktop

- GIVEN sprich open in the desktop app, its profiles `claude-sonnet` and `claude-opus` in `.harness/profiles.yaml`
- WHEN the Developer opens Settings
- THEN the Developer sees the nine sections in that order, and under Agents and profiles the agent set in `harness.config.yaml` and the profiles `claude-sonnet` and `claude-opus`

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
