# Design: specgate-1-4-gate

> Owner: architect — how the system meets the Discover. Name each acceptance
> criterion (AC-1, AC-2…) where it is answered.

## Modules

- `package.json`: `@rsaglobaltech/specgate` `^1.4.0`.
- `packages/core/src/domain/settings.ts`: a tenth section, `gate`, project scope, after `quality`; `sectionOfKey` sends `gate.*` there; `PROJECT_WORDS` gives the nine keys their names in English and Spanish.
- `packages/core/src/domain/` — a pure `gatePolicy.ts`: the policy line from `config list` values (REQ-226), and the grouping of `validate --strict` findings into failing and reported by `gate_rule_reported` (REQ-224).
- `packages/host` / `apps/cli/src/serve.ts`: the needed version (`needs`) wired into every host that `serve` starts (REQ-222).
- `apps/ui/src/views/Problems.tsx`, `Home.tsx`, `Settings.tsx`: render what the core worked out; no rule in the components.

## Mechanisms

- AC-1 — REQ-222. `startHost` already takes `needs` and checks it (REQ-013), but `serve` never passes it: the studio's needed version becomes a constant of the composition root, `1.4.0`, passed on every path.
- AC-2 — REQ-223. Settings already lists every key `config keys --json` gives and saves through `config set` (REQ-141, REQ-142); the `gate.*` keys only lack a section and words. A refusal (`config_value_invalid`) comes back on the row as for any key.
- AC-3 — REQ-224. In `validate --strict --json`'s `status`, a reported rule is a `warning` `gate_rule_reported` whose `target` is the rule, after that rule's findings, themselves turned into warnings. The core walks `status` in order and puts the warnings that precede each `gate_rule_reported` under its rule. `validation.passed` says whether the gate passed.
- AC-4 — REQ-225. `gate_policy_invalid` comes with `validation: null`, its `message` naming every problem and its `fix`; the core gives it `file: .specgate/gate.yaml` so Problems' open action works as for any finding with a file.
- AC-5 — REQ-226. The policy line is built from `gate.*` in `config list --json`; with none of them set (no file), there is no line, and Settings shows each key's default.

## Channels

No new JSON-RPC method: Problems, Home and Settings read what they read today; `validate --strict` and `config list` answer more.

## Decisions

- The policy line is read from `config list`, not from `check`'s text: `check --json` carries no policy (specgate 1.4.0), and parsing the text would break on its next wording.
- Problems lists the gate's findings beside the brief's (REQ-072): until now it held the brief's only. Open question Q1.
