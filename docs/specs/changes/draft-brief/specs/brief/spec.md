# Delta — brief

## ADDED Requirements

### Requirement: REQ-071 — The brief edited as a form and as markdown, one file

<!-- specgate:trace actor=Developer kind=functional -->

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

### Requirement: REQ-072 — The brief's checks on every save, in Problems

<!-- specgate:trace actor=Developer kind=functional -->

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

### Requirement: REQ-073 — "Draft the modules" drafts one module at a time with the agent

<!-- specgate:trace actor=Developer kind=functional -->

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

### Requirement: REQ-074 — The client's text proposes the form; nothing is saved until accepted

<!-- specgate:trace actor=Developer kind=business-rule -->

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
