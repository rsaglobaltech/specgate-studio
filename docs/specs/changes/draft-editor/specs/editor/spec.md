# Delta — editor

## ADDED Requirements

### Requirement: REQ-041 — The editor loads when the first file opens, not before

<!-- specgate:trace status="Needs Clarification" actor=Developer kind=functional -->

The system SHALL load the code editor only when the Developer opens the first file of the session, and SHALL show every view before that — Home, Changes, Questions — without loading it.

> Brief: "When a file is first opened, the Monaco editor loads; not before."

#### Scenario: SCN-121 — sprich's Home on the desktop, then its first file

- GIVEN the desktop app has opened sprich and shows Home, and no file has been opened yet
- WHEN the Developer opens `docs/specs/changes/draft-pedidos/specs/pedidos/spec.md` from the Explorer
- THEN the editor's code is loaded at that moment and the file is shown in it, and until then the app had not loaded the editor's code

#### Scenario: SCN-122 — Questions in the browser, without the editor

- GIVEN `specgate-studio serve` for sprich on `http://127.0.0.1:4180`
- WHEN the Developer opens that address and then Questions
- THEN Home and Questions are shown and the browser has not downloaded the editor's code, which it downloads only when the Developer opens a file

### Requirement: REQ-042 — Build, Check, Trace, Ask for a change and "?" above each requirement

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL show, above every `### Requirement:` heading of an open specification file, the actions Build, Check, Trace and Ask for a change, and a "?" that explains them, each action naming the specgate command it runs for that requirement.

> Brief: "Above each requirement: Build, Check, Trace, Ask for a change, and a help button."

#### Scenario: SCN-123 — The actions above REQ-031 on the desktop

- GIVEN the desktop app with sprich open
- WHEN the Developer opens `docs/specs/changes/draft-pedidos/specs/pedidos/spec.md`
- THEN above the heading of REQ-031 the Developer sees Build, Check, Trace, Ask for a change and "?", in that order, and the same five above every other requirement of the file

#### Scenario: SCN-124 — Check from above REQ-031 in the browser

- GIVEN the browser with sprich open and `docs/specs/changes/draft-pedidos/specs/pedidos/spec.md` in the editor
- WHEN the Developer clicks Check above REQ-031
- THEN `specgate check` runs, the terminal shows that command, and the action's notice names the command and how it ended

### Requirement: REQ-043 — Findings underlined where they are, with their fix

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL underline each finding of the gate and of the brief check at the file and line it names, and SHALL show, on that underline, the finding's code, its message and its fix.

> Brief: "Findings of the gate and the brief check are underlined where they are, with their fix."

#### Scenario: SCN-125 — REQ-031's "until it is shipped" on the desktop

- GIVEN sprich's draft-pedidos, whose open question Q2 blocks REQ-031, and REQ-031's text says "until it is shipped"
- WHEN the Developer opens `docs/specs/changes/draft-pedidos/specs/pedidos/spec.md` in the desktop app
- THEN the words "until it is shipped" in REQ-031 are underlined, and the underline says that Q2 is open, with the fix `specgate answer Q2 "…" --change draft-pedidos`

#### Scenario: SCN-126 — A gate finding at its line, in the browser

- GIVEN the last `specgate check` of sprich reported a finding with the code `D6_unlisted_value`, the file `docs/specs/changes/draft-pedidos/specs/pedidos/spec.md` and a line
- WHEN the Developer opens that file in the browser
- THEN that line is underlined, and the underline shows `D6_unlisted_value`, the finding's message and its fix

### Requirement: REQ-044 — A blocking question inline under its requirement, for the Reviewer

<!-- specgate:trace actor=Reviewer kind=functional -->

The system SHALL show each open question under every requirement it blocks, with its options, and SHALL let the Reviewer answer it there; the answer is written by `specgate answer`, never by the studio editing a file.

> Brief: "When a question blocks a requirement, it shows inline under it, with its options, for the Reviewer to answer."

#### Scenario: SCN-127 — Q2 under REQ-031 on the desktop

- GIVEN sprich's draft-pedidos, whose open question Q2 blocks REQ-031
- WHEN the Reviewer opens `docs/specs/changes/draft-pedidos/specs/pedidos/spec.md` in the desktop app
- THEN under REQ-031 the Reviewer sees Q2's text, the options its `questions.md` lists, and a place to answer it

#### Scenario: SCN-128 — Q2 answered from the browser

- GIVEN the browser with that file open and Q2 shown under REQ-031
- WHEN the Reviewer chooses the option "until it is shipped" and confirms
- THEN the studio runs `specgate answer Q2 "until it is shipped" --change draft-pedidos`, the notice names that command and the file it wrote, and Q2 no longer shows under REQ-031

### Requirement: REQ-045 — Saving writes the file, and nothing else is written without the person

<!-- specgate:trace actor=Developer kind=business-rule -->

The system SHALL write a file only when the Developer saves it, and SHALL write nothing else — no other file, no commit, no specgate command that writes — unless the person starts it.

> Brief: "Saving writes the file; nothing else is written without the person."

#### Scenario: SCN-129 — Saving pedidos' spec on the desktop

- GIVEN the desktop app with `docs/specs/changes/draft-pedidos/specs/pedidos/spec.md` open, an unsaved edit in it, and a clean git working tree
- WHEN the Developer saves it
- THEN `git status` shows that one file modified and nothing else, and no specgate command that writes has run

#### Scenario: SCN-130 — Closing an unsaved file in the browser

- GIVEN the browser with that file open and an unsaved edit in it
- WHEN the Developer closes its tab
- THEN the studio asks whether to save it, and when the Developer chooses not to, the file on disk is unchanged
