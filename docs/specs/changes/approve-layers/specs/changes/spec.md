# Delta — changes

## ADDED Requirements

### Requirement: REQ-217 — Each layer approved from Changes

<!-- specgate:trace status=Implemented actor=Developer kind=functional feature=features/changes/REQ-217.feature -->

The system SHALL show, beside each written layer of an open change that specgate 1.0 says is not approved yet, an "Approve <layer>" / "Aprobar <layer>" button with its "?"; SHALL run, when it is pressed, `specgate change approve <change> --layer <layer>` with `--json`, accepting from the UI only a change id and one of `discover`, `design` or `tasks`; and SHALL end with its notice — the layer approved and `docs/specs/changes/<change>/approvals.json` written, or specgate's refusal with its code, its fix and nothing written — after which Changes shows the layer's new state.

#### Scenario: SCN-971 — Ana approves discover, on the desktop

- GIVEN sprich on specgate 1.0 in the desktop app, git naming Ana, draft-pedidos with its discover written and not approved
- WHEN Ana presses "Approve discover" beside draft-pedidos' discover in Changes
- THEN Ana sees the notice "approved the discover layer of draft-pedidos" naming `docs/specs/changes/draft-pedidos/approvals.json`, and discover · product · approved

#### Scenario: SCN-972 — A layer not written yet, in the browser

- GIVEN sprich on specgate 1.0 in the browser, draft-pedidos with no design.md written
- WHEN the Developer asks to approve its design
- THEN the Developer sees the notice refused with `approve_layer_missing` and the fix "Write design.md, then approve it.", and nothing written
