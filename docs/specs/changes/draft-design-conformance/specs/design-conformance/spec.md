# Delta — design-conformance

## ADDED Requirements

### Requirement: REQ-171 — The boards' fonts, colours, 4 px corners and block shadow, shipped with the studio

<!-- specgate:trace status=Implemented actor=Developer kind=non-functional -->

The system SHALL draw every view with the fonts it ships — Syne for titles and the wordmark, IBM Plex Sans for text, IBM Plex Mono for code and commands — the boards' colours, 4 px corners on cards, buttons and fields, and the orange block shadow on the next-step card, the "?" popover and the palette; it SHALL load none of them from the network.

> Brief: "The studio ships its own fonts (Syne for titles, IBM Plex Sans for text, IBM Plex Mono for code) and draws with the boards' colours, 4 px corners and the orange block shadow, with no network."

#### Scenario: SCN-511 — Home of sprich offline, on the desktop

- GIVEN a Mac with no network and sprich open in the desktop app
- WHEN the Developer opens Home
- THEN the Developer sees the title "sprich" and the wordmark in Syne, the text in IBM Plex Sans, `specgate check` in IBM Plex Mono, the next-step card with its orange block shadow and 4 px corners, and no request left 127.0.0.1

#### Scenario: SCN-512 — The same identity in the browser

- GIVEN sprich in the browser
- WHEN the Developer opens Questions
- THEN the Developer sees the ground `#15161A`, the header and the activity bar on `#111215`, the side panel on `#1C1D22`, the primary button in `#FF5B1F`, the status bar in `#B93D0B`, and the question's title in Syne

### Requirement: REQ-172 — A frame without empty panels: the menu bar, the gate pill in its colour, a primary Build, and a status bar of the open view

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL hide the bottom panel and the tab strip unless they hold something; it SHALL offer the menu bar — the operating system's menu in the desktop app, a bar in the page's header in the browser — and SHALL show in the header the gate pill in the gate's colour and a primary Build, and in the status bar what the open view counts.

> Brief: "Unless they hold something, the bottom panel and the tab strip are hidden; the header carries the menu bar, the gate pill in the gate's colour and a primary Build, and the status bar shows what the open view counts."

#### Scenario: SCN-513 — Questions with nothing open, on the desktop

- GIVEN sprich in the desktop app with no file open, no terminal and the panel never opened, Q1 and Q2 open and Q4 to confirm
- WHEN the Developer opens Questions
- THEN the Developer sees no tab strip and no bottom panel, and the status bar reads "2 open · 1 to confirm"

#### Scenario: SCN-514 — The header after a green gate, in the browser

- GIVEN sprich in the browser, its last gate passed
- WHEN the Developer opens Home and chooses Terminal in the menu bar, then "New terminal"
- THEN the Developer sees the menu bar File, Spec, Build, Terminal, Help, the pill "Gate green" in green, the primary "Build", and the bottom panel opened with the new terminal

### Requirement: REQ-173 — Home leads with the next step, four counters, the route, the modules and the activity

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL show on Home, first, the next step as a sentence with its reason, its button and its "?"; then four counters — requirements, built, proven, the agent's cost; then the route, the modules with their progress and the activity; and a row of common actions.

> Brief: "Home leads with the next step as a sentence with its reason, its button and its "?", then four counters, the route, the modules and the activity, and a row of common actions; in an empty folder Home asks the five questions as option cards beside "Already have code?" and the recent projects."

#### Scenario: SCN-515 — sprich's Home with two questions open, on the desktop

- GIVEN sprich in the desktop app, with Q1 and Q2 of draft-pedidos open and blocking REQ-031 and REQ-034, 24 requirements, 15 built and 12 proven
- WHEN the Developer opens Home
- THEN the Developer sees "Answer 2 questions of the draft pedidos" with the reason that they block REQ-031 and REQ-034, "Answer now" and its "?"; the counters 24, 15, 12 and the agent's cost; the route at "Questions answered · 2 open"; pedidos among the modules; and the actions Check the gate, Doctor, New change, From a ticket, Open terminal

#### Scenario: SCN-516 — "Answer now" leads to the question, in the browser

- GIVEN sprich's Home in the browser, its next step "Answer 2 questions of the draft pedidos"
- WHEN the Developer presses "Answer now"
- THEN the Developer sees Questions with Q1 of draft-pedidos selected

### Requirement: REQ-174 — An empty folder's Home asks the five questions as option cards

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL show, on Home of an empty folder, the five setup questions as option cards with the command they run, beside "Already have code?" and the Developer's recent projects.

> Brief: "Home leads with the next step as a sentence with its reason, its button and its "?", then four counters, the route, the modules and the activity, and a row of common actions; in an empty folder Home asks the five questions as option cards beside "Already have code?" and the recent projects."

#### Scenario: SCN-517 — A new folder, on the desktop

- GIVEN the empty folder `~/proyectos/academia` opened in the desktop app, Claude Code installed, sprich and agentkit among the recent projects
- WHEN the Developer opens Home
- THEN the Developer sees the five questions as cards with one chosen in each, Claude Code marked "detected", "Create the project" with the command `specgate init` it runs, and beside them "Already have code?" with "Open folder…" and the recent sprich and agentkit

#### Scenario: SCN-518 — Choosing a card, in the browser

- GIVEN the empty folder `~/proyectos/academia` in the browser, its Home showing the five questions
- WHEN the Developer chooses the card "A service"
- THEN the Developer sees that card marked with the orange border, the other two of its question unmarked, and the command below updated

### Requirement: REQ-175 — Changes, Questions and Build list in a side panel; Live in three columns

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL list the items of Changes, Questions and Build in a side panel, grouped as their boards group them, with the selected item shown beside it; and SHALL show Live in three columns: the modules and the queue, the current requirement, and what needs attention with what has finished.

> Brief: "Changes, Questions and Build list their items in a side panel, grouped as their boards group them, and show the selected one beside it; Live shows the modules and the queue, the current requirement, and what needs attention, in three columns."

#### Scenario: SCN-519 — Questions grouped, on the desktop

- GIVEN sprich in the desktop app with Q1 and Q2 open and Q4 answered and waiting to be confirmed
- WHEN the Developer opens Questions
- THEN the Developer sees the side panel "QUESTIONS" with "OPEN · 2", "TO CONFIRM IN THE SPEC · 1" and "FROM THE AGENT, WHILE IT BUILDS · 0", and Q1 selected and shown beside it with its options

#### Scenario: SCN-520 — Build's ready and waiting, in the browser

- GIVEN sprich in the browser with REQ-012 and REQ-021 ready, REQ-012 chosen, and REQ-031 waiting on Q2
- WHEN the Developer opens Build
- THEN the Developer sees the side panel with "READY · APPROVED, NO QUESTIONS" listing REQ-012 and REQ-021 with a checkbox and an estimate each, "WAITING · CANNOT BE CHOSEN YET" listing REQ-031 with Q2, "Build 1 requirement" at its foot, and REQ-012's five steps beside it

#### Scenario: SCN-521 — Changes grouped, on the desktop

- GIVEN sprich in the desktop app with draft-pedidos to review, add-coupons in progress and auth-reset ready to archive
- WHEN the Developer opens Changes
- THEN the Developer sees the side panel "CHANGES" with "+ New", draft-pedidos under "TO REVIEW", add-coupons under "IN PROGRESS", auth-reset under "READY TO ARCHIVE", and draft-pedidos selected and shown beside it

#### Scenario: SCN-522 — Live in three columns, in the browser

- GIVEN sprich in the browser while REQ-012 builds, REQ-013 and REQ-021 queued, the agent asking a question
- WHEN the Developer opens Live
- THEN the Developer sees the modules and the queue on the left, REQ-012's steps and output in the middle, and the agent's question under "NEEDS ATTENTION" with the finished requirements on the right

### Requirement: REQ-176 — The "?" beside its button and the palette's explanation, under "[ UNDER THE HOOD ]"

<!-- specgate:trace status=Implemented actor=Reviewer kind=functional -->

The system SHALL open a feature's "?" as a popover beside the button that has it, not as a dialog in the middle of the window, and SHALL show in the palette the selected feature's explanation beside its list, both under "[ UNDER THE HOOD ]"; the palette SHALL group the features by area.

> Brief: "The "?" opens beside the button that has it, and the palette shows the selected feature's explanation beside its list, both under "[ UNDER THE HOOD ]"; the palette groups the features by area."

#### Scenario: SCN-523 — The "?" of "Ask for a change", on the desktop

- GIVEN the Reviewer on draft-pedidos in Changes, in the desktop app
- WHEN the Reviewer presses the "?" beside "Ask for a change"
- THEN the Reviewer sees, opened under that "?", "[ UNDER THE HOOD ]" with what it does, the command `specgate change note`, what it writes, what it does not do and what comes after, each a label and its text, and Escape closes it

#### Scenario: SCN-524 — The palette explains as the Reviewer moves, in the browser

- GIVEN the Reviewer in sprich in the browser
- WHEN the Reviewer opens the palette and types "ticket"
- THEN the Reviewer sees "Open a change from a ticket" selected under the group "SPEC", and beside the list "[ UNDER THE HOOD ]" with the command `specgate propose --from-ticket`

### Requirement: REQ-177 — Editor tabs show the file's type and a requirement's id and title; a breadcrumb shows where

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL show on each editor tab the file's type and, for a tab opened on a requirement, its id and title; and SHALL show above the editor a breadcrumb of where the open file is, down to the requirement under the cursor.

> Brief: "Editor tabs show the file's type and, for a requirement, its id and title, and a breadcrumb shows where the open file is."

#### Scenario: SCN-525 — REQ-031 opened from its module, on the desktop

- GIVEN sprich in the desktop app
- WHEN the Developer opens REQ-031 from the module pedidos
- THEN the Developer sees the tab "REQ-031 · Cancel an order" with the type "REQ", and the breadcrumb docs › specs › changes › draft-pedidos › pedidos › REQ-031

#### Scenario: SCN-526 — A feature and a test side by side, in the browser

- GIVEN sprich in the browser
- WHEN the Developer opens `features/pedidos/REQ-031.feature` and then `CancelOrder.test.ts`
- THEN the Developer sees the tabs "REQ-031.feature" with the type "FT" and "CancelOrder.test.ts" with the type "TS", and the breadcrumb of `CancelOrder.test.ts`

### Requirement: REQ-178 — Lost connection, loading, unreadable sections and failed actions say so

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL, while the connection to the host is lost, show a banner and a grey status bar until it is back and then read the open section again; SHALL show a section being read in its shape, never blank; SHALL name, for a section that cannot be read, the file and the line and offer to read it again; and SHALL keep a failed action's notice until it is closed, with a way to retry, while a success notice goes by itself.

> Brief: "When the connection to the host is lost, a banner and a grey status bar say so until it is back; a section being read shows its shape, a section that cannot be read names the file and line and offers to read it again, and a failed action's notice stays until it is closed and offers to retry."

#### Scenario: SCN-527 — The host stops and comes back, on the desktop

- GIVEN sprich's Home in the desktop app
- WHEN its host stops, and starts again
- THEN the Developer sees "Reconnecting to the studio…" in a banner and the status bar grey while it is stopped, and once it is back the banner gone, the status bar orange and Home read again

#### Scenario: SCN-528 — Traceability cannot be read, in the browser

- GIVEN sprich in the browser, its `docs/specs/traceability.md` with a row of 5 columns instead of 10 at line 48
- WHEN the Developer opens Traceability
- THEN the Developer sees "[ COULD NOT READ ]" naming `traceability.md` and line 48, "Read again" and "Open line 48", and Home, Questions and Build still working

#### Scenario: SCN-529 — An archive refused stays, on the desktop

- GIVEN sprich in the desktop app, draft-pedidos with REQ-031 still Draft
- WHEN the Developer archives draft-pedidos
- THEN the Developer sees the notice "draft-pedidos was not archived" with its reason and "Retry", still there until the Developer closes it

#### Scenario: SCN-530 — A slow first read shows the shape, in the browser

- GIVEN sprich in the browser on its first read, the traceability section taking 2 s to read
- WHEN the Developer opens Traceability
- THEN the Developer sees "[ LOADING ]" and grey bars in the shape of the table until the rows come, never a blank page

### Requirement: REQ-179 — The Help view: every "?" explanation, searchable, in English and Spanish

<!-- specgate:trace status=Implemented actor=Reviewer kind=functional -->

The system SHALL show in the Help view every feature's "?" explanation from the help catalog, grouped by area, with a search over their titles, commands and text, in the studio's language.

> Brief: "The "?" opens beside the button that has it, and the palette shows the selected feature's explanation beside its list, both under "[ UNDER THE HOOD ]"; the palette groups the features by area."

#### Scenario: SCN-531 — Searching "archive", on the desktop

- GIVEN the Reviewer in sprich in the desktop app, in English
- WHEN the Reviewer opens Help and types "archive"
- THEN the Reviewer sees "Archive a change" with its command `specgate archive` and its five parts, and no feature that does not mention it

#### Scenario: SCN-532 — The same catalogue in Spanish, in the browser

- GIVEN the Reviewer in sprich in the browser, in Spanish
- WHEN the Reviewer opens Help
- THEN the Reviewer sees the features grouped by area, each with its explanation in Spanish under "[ POR DEBAJO ]"
