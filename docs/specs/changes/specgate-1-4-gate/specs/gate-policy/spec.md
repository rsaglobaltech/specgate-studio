# Delta — gate-policy

## ADDED Requirements

### Requirement: REQ-222 — The studio needs specgate 1.4.0, and says so at start

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL depend on specgate `^1.4.0` and SHALL, when a project's host starts, check the installed specgate against 1.4.0 — in the desktop app and under `specgate-studio serve` alike — showing the notice of REQ-013 with 1.4.0 as the version needed when the installed one is older, and reading nothing until it is updated.

> Issue #39: "Depend on `^1.4.0` (the needed version the studio checks at start moves with it)."

#### Scenario: SCN-991 — specgate 1.0.0 installed, on the desktop

- GIVEN sprich in the desktop app, specgate 1.0.0 installed
- WHEN the Developer opens sprich
- THEN the Developer sees that the studio needs specgate 1.4.0 or later, with the command that updates it, and no section of sprich is read

#### Scenario: SCN-992 — specgate 1.4.2 installed, in the browser

- GIVEN `specgate-studio serve` for sprich, specgate 1.4.2 installed
- WHEN the Developer opens the studio's address
- THEN Home shows sprich's requirements and no notice about specgate's version

### Requirement: REQ-223 — The gate's policy in Settings: preset, rules and the date

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL show in Settings a project section "Gate" / "Gate" — after Quality — holding `gate.preset` (minimal, standard, strict), one row per rule of `gate.rules` (tdd, scenarios, requirements, links, coverage, ids, quality) with its three levels (error, warning, off), and `gate.enforce_from` (a date, YYYY-MM-DD), each with a name and description in English and Spanish, its value from `config list --json`, its default from `config keys --json` and its file `.specgate/gate.yaml`; and SHALL save each one only through `specgate config set`, showing a refusal (`config_value_invalid`) on the row as every other setting shows its own.

> Issue #39: "A 'Gate' section in Settings: the preset, one row per rule with its three levels, and the date. Saved through `config set`."

#### Scenario: SCN-993 — Coverage raised to error, on the desktop

- GIVEN sprich in the desktop app, its `.specgate/gate.yaml` saying `preset: standard` and `coverage: warning`
- WHEN the Developer opens Settings, then Gate, and sets coverage to error
- THEN the studio runs `specgate config set gate.rules.coverage error`, the row reads error, and `.specgate/gate.yaml` says `coverage: error`

#### Scenario: SCN-994 — A date that is no date, in the browser

- GIVEN sprich in the browser, Settings open on Gate
- WHEN the Developer writes `next month` as the date the gate enforces from
- THEN the row shows specgate's refusal `config_value_invalid` with its fix, and `.specgate/gate.yaml` is unchanged

#### Scenario: SCN-995 — No policy file, in the browser

- GIVEN sprich in the browser with no `.specgate/gate.yaml`
- WHEN the Developer opens Settings, then Gate
- THEN the preset reads strict as its default, every rule reads error as its default, and no date is set

### Requirement: REQ-224 — Findings the policy reports, apart from those that fail

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL list in Problems the findings of the gate's last `validate --strict`, and SHALL, for each rule `validate --strict` reports with `gate_rule_reported`, group that rule's findings under "Reported, not failed" / "Reportado, no falla" with the rule's name, the reason specgate gives and its fix — apart from the findings that fail the gate — and SHALL show the gate as passed when only such findings remain.

> Issue #39: "Problems groups what the policy reported apart from what failed, with the rule and the fix of `gate_rule_reported`."

#### Scenario: SCN-996 — Two untested scenarios under coverage: warning, on the desktop

- GIVEN sprich in the desktop app, `coverage: warning` in its policy, and two scenarios no test names
- WHEN the Developer runs Check from Home
- THEN the gate reads passed, and Problems lists the two findings under "Reported, not failed" with coverage, the reason `.specgate/gate.yaml sets coverage to warning` and the fix `set coverage: error … once they are`

#### Scenario: SCN-997 — One failure and one reported finding, in the browser

- GIVEN sprich in the browser, `coverage: warning` in its policy, one untested scenario and one path the matrix declares that does not exist
- WHEN the Developer runs Check from Home
- THEN the gate reads failed, Problems lists the missing path among the failures and the untested scenario under "Reported, not failed" with coverage

### Requirement: REQ-225 — A policy specgate cannot read is shown with each fix

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL, when specgate answers `gate_policy_invalid`, show in Problems and on Home's gate result that `.specgate/gate.yaml` cannot be read, with specgate's message naming every problem and its fix, and an action that opens `.specgate/gate.yaml` in the editor — never a gate that fails with nothing said.

> Issue #39: "A `.specgate/gate.yaml` saying `preset: lax` shows `gate_policy_invalid` with the presets to use, not a silent failure."

#### Scenario: SCN-998 — preset: lax, on the desktop

- GIVEN sprich in the desktop app, its `.specgate/gate.yaml` saying `preset: lax`
- WHEN the Developer runs Check from Home
- THEN Home and Problems show that `.specgate/gate.yaml` cannot be read, that preset `lax` is not one of minimal, standard, strict, and the fix "Use preset: minimal, standard or strict"

#### Scenario: SCN-999 — The policy opened from its finding, in the browser

- GIVEN sprich in the browser, Problems showing `gate_policy_invalid`
- WHEN the Developer opens the finding's file
- THEN `.specgate/gate.yaml` opens in the editor

### Requirement: REQ-226 — Home says the policy in force beside the gate's result

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL show on Home, beside the gate's result, the policy in force as `check` prints it — its preset and each rule whose level differs from error, or the date errors are enforced from while it is ahead — read from `config list --json`; and SHALL show no policy line for a project with no `.specgate/gate.yaml`, as before.

> Issue #39: "Home says the policy in force beside the gate's result." Acceptance: "A project with no policy file behaves as today."

#### Scenario: SCN-1000 — standard with coverage reported, on the desktop

- GIVEN sprich in the desktop app, its `.specgate/gate.yaml` saying `preset: standard`, `coverage: warning` and every other rule error
- WHEN the Developer opens Home
- THEN the Developer sees "Policy: standard · coverage warning" beside the gate's result

#### Scenario: SCN-1001 — No policy file, in the browser

- GIVEN sprich in the browser with no `.specgate/gate.yaml`
- WHEN the Developer opens Home
- THEN Home shows the gate's result with no policy line
