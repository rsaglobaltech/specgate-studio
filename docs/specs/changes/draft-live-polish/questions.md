# Questions — draft-live-polish

What only the person who owns the studio can decide. Q1 comes from the brief (`docs/briefs/live-polish.md`).

| # | Question | Blocks | Options seen | Answer | Status |
|---|---|---|---|---|---|
| Q1 | Which specgate event gives the lines an edit added and the tests a run passed, so the studio need not read them from the agent's text? | REQ-201 | specgate's adapter adds `added`/`removed` to `edit` and `write` steps and `pass`/`fail` to `test` steps (it sees the tool's input and output), in the next release; the studio shows "+N" and "N passing" once there, without them until then (A7) · The studio reads them from the agent's text (`output` events) — fragile, tied to each agent's wording · Leave the counts out: ✓ or ✗ only, the gate's own counts in "Gate: tests" |  | open |
