# Delta — brief-keep-client-text

## ADDED Requirements

### Requirement: REQ-238 — The accepted proposal keeps the client's text in the brief

<!-- specgate:trace status=Draft actor=Developer kind=business-rule -->

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
