# Assumptions — draft-brief

What the brief does not say, chosen so the scenarios can be tested. Each is to
confirm by the person reviewing the draft.

| # | Assumption | Used in | Why | Status |
|---|---|---|---|---|
| A1 | The example project is sprich, its `docs/brief.md` with the modules `pedidos` and `pagos` and a paragraph "Notes from the call with the client" outside every module | REQ-071 … REQ-074 | The project phase 1 was measured on (draft-core-host A6) | to confirm |
| A2 | The form holds the front matter (product, surfaces, actors, modules) and each module's Rules, Examples and Questions; every other line — prose, notes, the client's pasted text — is not the form's and is kept byte for byte when the form saves | REQ-071 | "keep every line that is not theirs" | to confirm |
| A3 | The brief's checks are `specgate propose --from-brief --check --brief docs/brief.md --json`; each finding carries code, message, fix, file and line (measured on specgate 0.32), shown in Problems and underlined in the editor as draft-editor REQ-043 does | REQ-072 | specgate owns the brief rules B1–B13 (ADR-0038); the studio runs them | to confirm |
| A4 | The rule "Shipping is free above some amount" carries the brief's "free above some amount" and is flagged with `B6_unmeasured` (a promised quantity with no number). Measured on specgate 0.32: the check flags "fast" (`B5_vague`, `B6_unmeasured`) but not "some amount" or "a certain amount" — specgate's B6 has to learn them; the studio shows what specgate reports | REQ-072, SCN-213 | The brief's example; the rule belongs to specgate, not the studio | to confirm |
| A5 | "Shipping is free above 50 EUR" is the rewritten rule of SCN-214 | REQ-072, SCN-214 | A number makes the finding go | to confirm |
| A6 | The agent is the project's `agent` (harness.config.yaml, the one Build runs); "Draft the modules" runs `specgate propose --from-brief <module> --agent "<agent>"` for each module not drafted yet, in the brief's order, through the host's commands (argument arrays, one write at a time — draft-core-host REQ-006, REQ-007) | REQ-073 | "with the agent, one module at a time" | to confirm |
| A7 | Pressing it while a module drafts is refused with `write_busy`, as any write while another runs (draft-core-host REQ-006) | REQ-073, SCN-216 | One write at a time | to confirm |
| A8 | With no agent set, nothing runs and the notice names `specgate agents init --tool claude`, which sets the agent since specgate 0.33.0 | REQ-073, SCN-217 | Never "done" without saying what is missing (draft-help REQ-063) | to confirm |
| A9 | Pasting runs `specgate propose --from-brief --agent "<agent>"` on the text saved to a temporary file outside the project, never on `docs/brief.md`; the form shows what the agent proposes; "Accept" writes it to `docs/brief.md` as a form save (A2); "Discard" drops it | REQ-074 | "nothing is saved until the person accepts" | to confirm |
| A10 | The labels are "Paste the client's text", "Accept" and "Discard"; the client's text of the pedidos call is the example's input | REQ-074 | Labels the brief does not give | to confirm |
| A11 | The commands this module runs — the brief check, `propose --from-brief <module> --agent`, `propose --from-brief --agent` — join the host's allowed commands and the help catalog in English and Spanish (draft-help REQ-065) | REQ-072 … REQ-074 | Every feature runs a specgate command and says what it does | to confirm |
| A12 | The desktop app and the browser run the same UI bundle (draft-workbench A2) | REQ-071 … REQ-074 | One UI | to confirm |
