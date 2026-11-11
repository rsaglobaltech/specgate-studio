# Delta — questions

## ADDED Requirements

### Requirement: REQ-091 — Every open question in one place, with what it blocks

<!-- specgate:trace status=Implemented actor=Reviewer kind=functional -->

The system SHALL list in the studio's Questions view every open question of the project — those the brief leaves open, those the drafts ask, and those the agent asks while it builds — each with the requirements it blocks and where it was asked, read from specgate's questions and never from the studio's own copy.

> Brief: "Open questions from the brief, the drafts and the agent while it builds, each with the requirements it blocks."

#### Scenario: SCN-271 — Q1 listed with what it blocks, on the desktop

- GIVEN sprich open in the desktop app, its draft `draft-pedidos` asking Q1, which blocks REQ-034
- WHEN the Reviewer opens Questions
- THEN the Reviewer sees Q1 with its text, the change `draft-pedidos` it was asked in, and REQ-034 as the requirement it blocks

#### Scenario: SCN-272 — A question the agent asked while it builds, in the browser

- GIVEN sprich open in the browser, and the agent building REQ-034 has asked a question about it with `specgate ask`
- WHEN the Reviewer opens Questions
- THEN the Reviewer sees that question beside Q1, marked as asked by the agent while it builds, with REQ-034 as the requirement it blocks

### Requirement: REQ-092 — An answer is written to its row, and the requirement stays blocked

<!-- specgate:trace status=Implemented actor=Reviewer kind=business-rule -->

The system SHALL write the Reviewer's answer to the question's row of `questions.md` through `specgate answer`, and SHALL keep each requirement the question blocks in Needs Clarification, still blocked, until the Reviewer confirms that the specification says the answer.

> Brief: "An answer is written to its row of `questions.md`; "The spec says it" marks it reviewed and lifts Needs Clarification."

#### Scenario: SCN-273 — Q1 answered "50 €" on the desktop

- GIVEN sprich open in the desktop app, Q1 of `draft-pedidos` open and blocking REQ-034
- WHEN the Reviewer answers Q1 "50 €" in Questions
- THEN the studio runs `specgate answer Q1 "50 €" --change draft-pedidos`, Q1's row of `questions.md` reads "50 €", and REQ-034 still shows Needs Clarification, blocked until confirmed

#### Scenario: SCN-274 — Q1 answered "50 €" in the browser

- GIVEN sprich open in the browser, Q1 of `draft-pedidos` open and blocking REQ-034
- WHEN the Reviewer answers Q1 "50 €" in Questions
- THEN the Reviewer sees Q1 answered "50 €" and waiting for "The spec says it", and REQ-034 still blocked

### Requirement: REQ-093 — "The spec says it" marks the answer reviewed and lifts Needs Clarification

<!-- specgate:trace status=Implemented actor=Reviewer kind=business-rule -->

The system SHALL offer "The spec says it" on an answered question, and when the Reviewer confirms it SHALL mark the answer reviewed through `specgate answer <Q> --reviewed` and lift Needs Clarification from every requirement the question blocked; the studio SHALL NOT change a requirement's text itself.

> Brief: "An answer is written to its row of `questions.md`; "The spec says it" marks it reviewed and lifts Needs Clarification."

#### Scenario: SCN-275 — Q1 confirmed on the desktop

- GIVEN sprich open in the desktop app, Q1 answered "50 €" and REQ-034 already revised to say "50 €"
- WHEN the Reviewer presses "The spec says it" on Q1
- THEN the studio runs `specgate answer Q1 --reviewed --change draft-pedidos`, Q1 leaves the open questions, and REQ-034 no longer shows Needs Clarification

#### Scenario: SCN-276 — Q1 confirmed in the browser

- GIVEN sprich open in the browser, Q1 answered "50 €" and REQ-034 already revised to say "50 €"
- WHEN the Reviewer presses "The spec says it" on Q1
- THEN the Reviewer sees Q1 reviewed and REQ-034 unblocked, and the notice names the command that ran and the files it wrote
