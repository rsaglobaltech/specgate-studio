# Assumptions — draft-editor

What the brief does not say, chosen so the scenarios can be tested. Each is to
confirm by the person reviewing the draft.

| # | Assumption | Used in | Why | Status |
|---|---|---|---|---|
| A1 | The example project is sprich at `~/mvp/sprich-platform/sprich`, its draft `draft-pedidos`, whose spec is `docs/specs/changes/draft-pedidos/specs/pedidos/spec.md` | REQ-041 … REQ-045 | The project the brief's examples come from (draft-core-host A6) | to confirm |
| A2 | Q2 of draft-pedidos is open, blocks REQ-031, and lists "until it is shipped" among its options | REQ-043, REQ-044 | The brief's example names REQ-031, "until it is shipped" and Q2; that the phrase is one of Q2's options is assumed | to confirm |
| A3 | The web host answers on `http://127.0.0.1:4180` | REQ-041 | draft-core-host A2 | confirmed |
| A4 | "The editor loads" is measured as the editor's code not being loaded (desktop) or downloaded (browser) before the first file opens | REQ-041 | Observable by a test: the lazy chunk is requested only on the first open | to confirm |
| A5 | The four actions appear in the brief's order — Build, Check, Trace, Ask for a change — then "?" | REQ-042 | The brief's order; the IDE canvas shows them as code lenses above the heading | to confirm |
| A6 | Each action runs one specgate command for that requirement: Check runs `specgate check`; Build, Trace and Ask for a change are specified by their own modules in phase 2 | REQ-042 | Phase 2 brief (build-live, traceability, changes) owns what they do; the editor owns where they are | to confirm |
| A7 | An open question is shown as a finding at the words of the requirement the question is about; the fix is the `specgate answer` command | REQ-043 | The brief's example; specgate's findings carry code, message and fix (SpecgatePort) | to confirm |
| A8 | `D6_unlisted_value` is used as an example of a finding with a file and a line | REQ-043 | A real code of specgate's brief check | to confirm |
| A9 | The Reviewer's answer is written by `specgate answer <Q> "<answer>" --change <id>`; the studio never edits `questions.md` itself | REQ-044 | specgate owns its files; the studio runs specgate (brief: "Every feature runs a specgate command") | to confirm |
| A10 | Closing a tab with unsaved edits asks "save or not"; nothing is saved automatically | REQ-045 | "nothing else is written without the person" | to confirm |
| A11 | Monaco, loaded only when the first file opens. Switch to CodeMirror 6 only if opening the first file of sprich exceeds a measured limit. | REQ-041 | Q1 | decided |
