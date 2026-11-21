# Delta — brief-paste-progress

## ADDED Requirements

### Requirement: REQ-235 — While the agent proposes the form, the client's text is locked and the dialog shows what the studio is doing

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

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
