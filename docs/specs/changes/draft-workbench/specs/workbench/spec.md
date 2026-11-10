# Delta — workbench

## ADDED Requirements

### Requirement: REQ-031 — The same activity bar on every screen

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL show, on every screen, one activity bar with the same eleven views in this order: Home, Explorer, Brief, Changes, Questions, Build, Live, Traceability and Report at the top, and Help and Settings at the bottom, the open view marked.

> Brief: "On every screen, an activity bar with the same eleven views in this order: Home, Explorer, Brief, Changes, Questions, Build, Live, Traceability, Report; Help and Settings at the bottom."

#### Scenario: SCN-091 — Changes open in the desktop app

- GIVEN the desktop app with sprich open on Home
- WHEN the Developer opens Changes from the activity bar
- THEN the activity bar shows Home, Explorer, Brief, Changes, Questions, Build, Live, Traceability, Report at the top and Help, Settings at the bottom, in that order, with Changes marked as the open view

#### Scenario: SCN-092 — Report open in the browser

- GIVEN `specgate-studio serve` for sprich open in the browser on Home
- WHEN the Developer opens Report from the activity bar
- THEN the activity bar shows the same eleven views in the same order as on Home, with Report marked as the open view

### Requirement: REQ-032 — Editor tabs, a bottom panel and a status bar

<!-- specgate:trace status=Draft actor=Developer kind=functional -->

The system SHALL frame every view with editor tabs, a bottom panel with the tabs Terminal, Gate, Problems, Agent output and Traceability, and a status bar that shows the branch, the ticket, the gate, the progress and the cost; and SHALL answer from the first day to these shortcuts: Ctrl/Cmd+Shift+P and F1 (the command palette), Ctrl/Cmd+P (open a file), Ctrl/Cmd+S (save), Ctrl/Cmd+W (close a tab), Ctrl+Tab and Ctrl+Shift+Tab (next and previous tab), Ctrl/Cmd+B (the side bar), Ctrl/Cmd+J (the bottom panel), Ctrl+` (the terminal), Ctrl/Cmd+Shift+E (Explorer), Ctrl/Cmd+F (find), Ctrl/Cmd+Shift+F (search the project) and Ctrl/Cmd+, (Settings).

> Brief: "Editor tabs, a bottom panel (Terminal, Gate, Problems, Agent output, Traceability) and a status bar with branch, ticket, gate, progress and cost."

#### Scenario: SCN-093 — The status bar of sprich in the desktop app

- GIVEN the desktop app with sprich open on the branch `feat/mvp-fase-1`
- WHEN the Developer opens Home
- THEN the status bar shows the branch `feat/mvp-fase-1`, no ticket, the gate's last result, the requirements done of the total, and the cost, and the bottom panel offers the tabs Terminal, Gate, Problems, Agent output and Traceability

#### Scenario: SCN-094 — Two files open as tabs in the browser

- GIVEN sprich open in the browser with `docs/brief.md` open in the editor
- WHEN the Developer opens `docs/specs/changes/draft-workbench/proposal.md` from Explorer
- THEN two editor tabs show, `brief.md` and `proposal.md`, with `proposal.md` the active one

#### Scenario: SCN-103 — The bottom panel and the tabs by keyboard on the desktop

- GIVEN the desktop app on macOS with sprich open, `brief.md` and `proposal.md` open as tabs, `proposal.md` active, and the bottom panel hidden
- WHEN the Developer presses Cmd+J, then Ctrl+Shift+Tab
- THEN the bottom panel shows, and `brief.md` is the active tab

### Requirement: REQ-033 — A command palette that names each command

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL open a command palette when the Developer presses Ctrl+Shift+P, or Cmd+Shift+P on macOS, that lists every feature of the studio with the specgate command it runs, filters the list as the Developer types, and opens the highlighted feature on Enter.

> Brief: "When a Developer presses Ctrl/Cmd+Shift+P, a command palette lists every feature with the command it runs."

#### Scenario: SCN-095 — Opening a change from a ticket in the desktop app

- GIVEN the desktop app with sprich open on Home
- WHEN the Developer types Ctrl+Shift+P, "ticket", Enter
- THEN "Open a change from a ticket" opens

#### Scenario: SCN-096 — The palette shows the command in the browser

- GIVEN sprich open in the browser on macOS
- WHEN the Developer presses Cmd+Shift+P and types "ticket"
- THEN the palette lists "Open a change from a ticket" with the command it runs, `specgate propose --from-ticket <KEY>`, beside it

### Requirement: REQ-034 — Spanish or English, dark or light

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL start in dark, and SHALL switch every label of the studio between Spanish and English, and its theme between dark and light, when the Developer chooses one, without reloading the project.

> Brief: "When a Developer chooses a language or a theme, the studio switches between Spanish and English, and between dark (the default) and light."

#### Scenario: SCN-097 — English in the desktop app

- GIVEN the desktop app in Spanish with sprich open on Cambios
- WHEN the Developer chooses English in Settings
- THEN the open view is titled Changes, the activity bar reads Home, Explorer, Brief, Changes, Questions, Build, Live, Traceability, Report, Help, Settings, and sprich is not read again

#### Scenario: SCN-098 — Light in the browser

- GIVEN sprich open for the first time in the browser
- WHEN the Developer opens Settings
- THEN the theme chosen is dark, and choosing light turns the activity bar, the editor and the panels light at once

### Requirement: REQ-035 — Visible in under 300 ms, interactive in under 1 s

<!-- specgate:trace actor=Developer kind=non-functional -->

The system SHALL, on a cold start, show the workbench in under 300 ms and let the Developer use it in under 1 s, measured from the moment the window or the page is asked for.

> Brief: "On a cold start the window is visible in under 300 ms and interactive in under 1 s."

#### Scenario: SCN-099 — Cold start of the desktop app

- GIVEN the desktop app not running, and sprich as the last project opened
- WHEN the Developer starts the desktop app
- THEN the window with the activity bar shows in under 300 ms, and the command palette opens on Ctrl+Shift+P in under 1 s

#### Scenario: SCN-100 — First load in the browser

- GIVEN `specgate-studio serve` for sprich running and the browser's cache empty
- WHEN the Developer opens the studio's address
- THEN the activity bar shows in under 300 ms, and Changes opens from it in under 1 s

### Requirement: REQ-036 — Views switch in under 50 ms; 5,000 rows scroll at 60 fps

<!-- specgate:trace actor=Developer kind=non-functional -->

The system SHALL show a view the Developer opens from the activity bar in under 50 ms once the project is read, and SHALL scroll a list of 5,000 rows at 60 fps.

> Brief: "Switching views takes under 50 ms; lists of 5,000 rows scroll at 60 fps."

#### Scenario: SCN-101 — From Home to Changes in the desktop app

- GIVEN the desktop app with sprich open and read, on Home
- WHEN the Developer opens Changes from the activity bar
- THEN Changes shows in under 50 ms

#### Scenario: SCN-102 — A matrix of 5,000 rows in the browser

- GIVEN a project whose Traceability lists 5,000 rows, open in the browser
- WHEN the Developer scrolls that list from its first row to its last
- THEN it scrolls at 60 fps
