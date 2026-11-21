# Brief

## Requirements

### Requirement: REQ-071 — The brief edited as a form and as markdown, one file

The system SHALL let the Developer edit the brief both as a form and as markdown, both writing `docs/brief.md`, and SHALL keep byte for byte every line of the file the form does not hold when the form saves it.

> Brief: "The brief is edited as a form and as markdown; both write `docs/brief.md` and keep every line that is not theirs."

#### Scenario: SCN-211 — A rule changed in the form on the desktop

- GIVEN sprich open in the desktop app, its `docs/brief.md` with the modules `pedidos` and `pagos` and a paragraph "Notes from the call with the client" outside every module
- WHEN the Developer changes the first rule of `pedidos` in the Brief view's form and saves
- THEN `docs/brief.md` has the new rule under `pedidos`, and the paragraph "Notes from the call with the client" and every other line are unchanged

#### Scenario: SCN-212 — A rule changed as markdown in the browser

- GIVEN sprich open in the browser, `docs/brief.md` open in the editor
- WHEN the Developer adds a rule to `pagos` in the markdown, saves, and opens the Brief view's form
- THEN the form lists the new rule under `pagos`, read from the same `docs/brief.md`

<!-- specgate:trace actor=Developer feature=features/brief/REQ-071.feature kind=functional status=Implemented -->

### Requirement: REQ-072 — The brief's checks on every save, in Problems

The system SHALL run the brief's checks each time `docs/brief.md` is saved, from the form or as markdown, and SHALL show each finding in the bottom panel's Problems with its code, its message, its fix and the line it points at.

> Brief: "The brief's checks run on every save and show in Problems."

#### Scenario: SCN-213 — "free above some amount" flagged on the desktop

- GIVEN sprich open in the desktop app
- WHEN the Developer saves the rule "Shipping is free above some amount" in the module `pedidos`
- THEN Problems lists a vague value at that rule's line, with the code `B6_unmeasured` and a fix that asks for the amount as a number

#### Scenario: SCN-214 — The finding goes once the value is a number, in the browser

- GIVEN sprich open in the browser, Problems listing the vague value of "free above some amount"
- WHEN the Developer rewrites the rule as "Shipping is free above 50 EUR" and saves
- THEN Problems no longer lists that finding

<!-- specgate:trace actor=Developer feature=features/brief/REQ-072.feature kind=functional status=Implemented -->

### Requirement: REQ-073 — "Draft the modules" drafts one module at a time with the agent

The system SHALL, when the Developer presses "Draft the modules", run `specgate propose --from-brief <module>` with the project's agent for each module of the brief not drafted yet, one module at a time — the next starting only when the previous one has ended — and SHALL refuse it before running anything when no agent is set, naming the command that sets one.

> Brief: ""Draft the modules" runs `propose --from-brief <module>` with the agent, one module at a time."

#### Scenario: SCN-215 — Two modules drafted in turn on the desktop

- GIVEN sprich open in the desktop app, its brief with the modules `pedidos` and `pagos`, neither drafted, and an agent set
- WHEN the Developer presses "Draft the modules"
- THEN the terminal shows `specgate propose --from-brief pedidos` run with the agent, named by the button "Draft the modules", and `specgate propose --from-brief pagos` starts only after it has ended

#### Scenario: SCN-216 — Pressed again while a module is drafting, in the browser

- GIVEN sprich open in the browser, "Draft the modules" drafting `pedidos`
- WHEN the Developer presses "Draft the modules" again
- THEN it is refused with `write_busy`, naming `specgate propose --from-brief pedidos`, and no second draft starts

#### Scenario: SCN-217 — No agent set, on the desktop

- GIVEN sprich open in the desktop app with no agent set
- WHEN the Developer presses "Draft the modules"
- THEN nothing runs, and the notice names `specgate agents init --tool claude` as the way to set one

<!-- specgate:trace actor=Developer feature=features/brief/REQ-073.feature kind=functional status=Implemented -->

### Requirement: REQ-074 — The client's text proposes the form; nothing is saved until accepted

The system SHALL, when the Developer pastes the client's text into the Brief view, have the agent propose the form's fields from it and show that proposal, and SHALL write nothing to `docs/brief.md` until the Developer accepts it; discarding the proposal SHALL leave the file as it was.

> Brief: "Pasting the client's text lets the agent propose the form; nothing is saved until the person accepts."

#### Scenario: SCN-218 — The proposal accepted on the desktop

- GIVEN sprich open in the desktop app, an agent set, and the client's text of the pedidos call
- WHEN the Developer pastes it into "Paste the client's text", reviews the proposed form, and presses "Accept"
- THEN `docs/brief.md` has the proposed modules, rules and examples, and before "Accept" the file had not changed

#### Scenario: SCN-219 — The proposal discarded in the browser

- GIVEN sprich open in the browser, the agent's proposed form shown for the pasted text
- WHEN the Developer presses "Discard"
- THEN `docs/brief.md` is unchanged byte for byte, and no file of sprich was written

<!-- specgate:trace actor=Developer feature=features/brief/REQ-074.feature kind=business-rule status=Implemented -->

### Requirement: REQ-238 — The accepted proposal keeps the client's text in the brief

The system SHALL, when the Developer accepts the form proposed from the client's text (REQ-074), write into `docs/brief.md` both the proposed front matter and the client's text itself, as the brief's body below the front matter: the whole body when the brief had none, and after the existing body, separated by a blank line, when it had one; and SHALL NOT add the text again when the body already holds it. Discarding the proposal SHALL still write nothing.

> In a real project the accepted brief held only its front matter: the client's text had been read from a temporary file and was gone, so specgate refused to draft (`B2_empty_brief`) and no requirement could be written.

#### Scenario: SCN-1016 — A brief with no body, the proposal accepted

- GIVEN sprich in the browser, `docs/brief.md` with its front matter and no body, an agent set
- WHEN the Developer pastes the client's text, the form is proposed, and the Developer presses "Accept"
- THEN `docs/brief.md` has the proposed front matter and, below it, the client's text as it was pasted

#### Scenario: SCN-1017 — The same text accepted twice, on the desktop

- GIVEN sprich on the desktop, `docs/brief.md` whose body already holds the client's text
- WHEN the Developer pastes the same text again and accepts the proposal
- THEN the body holds the client's text once

<!-- specgate:trace actor=Developer feature=features/brief/REQ-238.feature kind=business-rule status=Implemented -->

### Requirement: REQ-235 — While the agent proposes the form, the client's text is locked and the dialog shows what the studio is doing

The system SHALL, from the moment the Developer presses "Propose the form" in "Paste the client's text" until specgate answers, keep the client's text read-only and the dialog open — neither a click outside it nor Escape closes it — and SHALL show in the dialog, in order, what the studio is doing: (1) "The text is kept in a temporary file, outside the project" — done; (2) "<agent> reads it and proposes the form; specgate checks it" — under way, with the seconds it has taken so far and the specgate command that runs it, as the terminal shows it; (3) "The proposed form, to review" — still to come. When specgate answers with a proposal, the dialog SHALL close and the proposal be shown as before (REQ-074); when it refuses, step (2) SHALL show as failed with specgate's message and its fix, and the text SHALL be editable again.

> In a real project the Developer could edit the pasted text while the agent was reading it, and saw only "The agent is reading the client's text…" for a minute or more, with no sign of what was running.

#### Scenario: SCN-1014 — The proposal under way, in the browser

- GIVEN sprich open in the browser, an agent set, and the client's text pasted into "Paste the client's text"
- WHEN the Developer presses "Propose the form" and specgate has not answered yet
- THEN the text cannot be edited, a click outside the dialog leaves it open, and the dialog shows the temporary file as done, "claude reads it and proposes the form; specgate checks it" under way with its seconds and the `specgate propose --from-brief` command, and the proposed form still to come

#### Scenario: SCN-1015 — specgate refuses, on the desktop

- GIVEN sprich open in the desktop app, the proposal under way
- WHEN specgate answers `draft_no_front_matter` with its fix
- THEN the dialog shows the agent's step as failed with "The agent wrote no front matter." and its fix, the text can be edited again, and `docs/brief.md` is unchanged

<!-- specgate:trace actor=Developer feature=features/brief/REQ-235.feature kind=functional status=Implemented -->
