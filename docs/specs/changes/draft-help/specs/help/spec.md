# Delta — help

## ADDED Requirements

### Requirement: REQ-061 — A "?" beside every feature that acts, for the Developer

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL show a "?" beside every feature that writes, runs, commits, pushes or sends; clicking it SHALL open an explanation with five parts — what it does, the command it runs, the files it changes, what it does not do, and what comes next — without running anything.

> Brief: "Every feature that writes, runs, commits, pushes or sends has a "?" with: what it does, the command, the files it changes, what it does not do, what comes next."

#### Scenario: SCN-181 — The "?" beside Check, on the desktop

- GIVEN sprich open in the desktop app, on Home
- WHEN the Developer clicks the "?" beside Check
- THEN the Developer sees what Check does, the command `specgate check`, that it changes no file, that it does not commit or push, and that next comes `specgate apply` for a requirement whose test passes — and no command was run

#### Scenario: SCN-182 — The "?" beside Build, in the browser

- GIVEN sprich open in the browser, on REQ-031 of draft-pedidos
- WHEN the Developer clicks the "?" beside Build
- THEN the Developer sees what Build does, the command `specgate harness run --req REQ-031`, the files it may change, that it does not push, and that next comes the gate on the branch it opens — and no command was run

### Requirement: REQ-062 — The "?" beside Ask for a change, for the Reviewer

<!-- specgate:trace actor=Reviewer kind=functional -->

The system SHALL show the Reviewer the same five-part explanation beside every feature the Reviewer uses that writes or sends; beside Ask for a change it SHALL say that the request is written to the draft's `review.md` and that the draft itself changes only when it is drafted again.

> Brief: "Every feature that writes, runs, commits, pushes or sends has a "?" with: what it does, the command, the files it changes, what it does not do, what comes next."

#### Scenario: SCN-183 — Ask for a change explained, on the desktop

- GIVEN draft-pedidos open for review in the desktop app
- WHEN the Reviewer clicks the "?" beside Ask for a change
- THEN the Reviewer sees that the request is written to `docs/specs/changes/draft-pedidos/review.md`, that the draft's requirements do not change now, and that next the draft is drafted again with `specgate propose --from-brief pedidos`

#### Scenario: SCN-184 — Ask for a change explained, in the browser

- GIVEN draft-pedidos open for review in the browser
- WHEN the Reviewer clicks the "?" beside Ask for a change
- THEN the Reviewer sees the same explanation as on the desktop: the request goes to `review.md`, and the draft changes only when it is drafted again

### Requirement: REQ-063 — The notice when an action ends names what happened and the next step

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL, when an action ends, show a notice that names the command that ran, what it wrote, committed or pushed — or that it wrote nothing — and the next step as a command; the notice SHALL never be only "done", and an action that fails SHALL name what failed and its fix.

> Brief: "When an action ends, its notice says what was written or run and the next step; never only "done"."

#### Scenario: SCN-185 — Check ends, on the desktop

- GIVEN sprich open in the desktop app
- WHEN the Developer presses Check and it passes
- THEN the Developer sees a notice that `specgate check` ran its specification, architecture and test stages, that no file was written, and the next step `specgate apply REQ-031` — not only "done"

#### Scenario: SCN-186 — Apply is refused, in the browser

- GIVEN REQ-031 with no test that names it, in the browser
- WHEN the Developer presses Apply on REQ-031
- THEN the Developer sees a notice that `specgate apply REQ-031` was refused with `apply_no_test`, that nothing was written, and the fix: write a test that names REQ-031

### Requirement: REQ-064 — After Ask for a change, the Reviewer is told the draft has not changed yet

<!-- specgate:trace actor=Reviewer kind=functional -->

The system SHALL, when the Reviewer's Ask for a change ends, show a notice that names the file the request was written to, says that the draft's requirements are unchanged until the draft is drafted again, and gives that command as the next step; it SHALL never say only "done".

> Brief: "When an action ends, its notice says what was written or run and the next step; never only "done"."

#### Scenario: SCN-187 — The request is written, on the desktop

- GIVEN draft-pedidos open for review in the desktop app
- WHEN the Reviewer sends "Orders can be cancelled until they are shipped" with Ask for a change
- THEN the Reviewer sees a notice that the request was written to `docs/specs/changes/draft-pedidos/review.md`, that the requirements are unchanged, and the next step `specgate propose --from-brief pedidos`

#### Scenario: SCN-188 — The request is written, in the browser

- GIVEN draft-pedidos open for review in the browser
- WHEN the Reviewer sends "Orders can be cancelled until they are shipped" with Ask for a change
- THEN the Reviewer sees the same notice, and the draft shown is still the one before the request

### Requirement: REQ-065 — Every explanation in English and Spanish, or the tests fail

<!-- specgate:trace actor=Developer kind=business-rule -->

The system SHALL keep the explanation and the notices of every action that writes, runs, commits, pushes or sends as data in English and in Spanish, and the project's tests SHALL fail, naming the action and the missing language, when one of them lacks either.

> Brief: "When an action has no explanation in both languages, the project's tests fail."

#### Scenario: SCN-189 — The Spanish explanation, on the desktop

- GIVEN the desktop app switched to Spanish
- WHEN the Developer clicks the "?" beside Check
- THEN the Developer sees the five parts of the explanation in Spanish

#### Scenario: SCN-190 — The English explanation, in the browser

- GIVEN the studio in the browser, in English
- WHEN the Developer clicks the "?" beside Archive
- THEN the Developer sees the five parts of the explanation in English

#### Scenario: SCN-191 — An action with no Spanish explanation fails the tests

- GIVEN the action Archive with an English explanation and no Spanish one
- WHEN the Developer runs `npm test`
- THEN the tests fail, naming the action `archive` and the language `es`
