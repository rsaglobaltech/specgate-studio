# Tasks

> Owner: developer — each task is verifiable and names the requirement it
> delivers (REQ-NNN).

## 1. Specification

- [x] 1.1 Write the delta spec for gate-policy
- [x] 1.2 Run `specgate change validate`
- [x] 1.3 Review: the person who owns the studio answers Q1 and approves

## 2. Implementation

- [x] 2.1 REQ-222 — specgate `^1.4.0`; `needs: "1.4.0"` passed by `serve` on every path
- [ ] 2.2 REQ-223 — the Gate section in Settings, its nine keys with their words
- [ ] 2.3 REQ-224 — findings grouped failing / reported by `gate_rule_reported`, in Problems
- [ ] 2.4 REQ-225 — `gate_policy_invalid` on Home and in Problems, opening `.specgate/gate.yaml`
- [ ] 2.5 REQ-226 — the policy line on Home from `config list`
