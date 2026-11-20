# Discover: specgate-1-4-gate

> Owner: product — what the business needs and why. No technology here: the
> design says how.

Source: issue #39, "Follow specgate 1.4: the gate's policy in Settings, Problems and Home".

## Context

specgate 1.4 lets a project say what its gate requires: a preset (minimal,
standard, strict), each rule failing, reporting or off, and a date until which
every failure is only reported. Projects adopted or created since 1.4 carry
that policy from their first day, with coverage reported rather than failed.
The studio is still on specgate 1.0: the Developer cannot see the policy,
cannot change it, and cannot tell a finding that fails the gate from one the
policy only reports. A policy specgate cannot read makes the gate fail with
nothing in the studio saying why.

## Use case

1. The Developer opens a project in the studio; Home shows the gate's result and the policy in force.
2. The Developer runs Check: what fails and what is only reported show apart, each with its rule and its fix.
3. The Developer opens Settings → Gate and raises a rule from warning to error once its findings are fixed.
4. A policy file with a mistake shows each problem with its fix and opens in the editor.

## Acceptance criteria

- AC-1: The studio runs on specgate 1.4 and tells the Developer when the installed one is older.
- AC-2: In a project with `preset: standard`, Settings shows `coverage: warning`; changing it to error writes `.specgate/gate.yaml`.
- AC-3: A project whose only findings come from a rule set to warning shows a passing gate and those findings as reported, with the rule's name.
- AC-4: A `.specgate/gate.yaml` saying `preset: lax` shows `gate_policy_invalid` with the presets to use, not a silent failure.
- AC-5: A project with no policy file behaves as today.
