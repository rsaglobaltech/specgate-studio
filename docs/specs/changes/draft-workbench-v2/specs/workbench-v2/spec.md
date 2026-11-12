# Delta — workbench-v2

## ADDED Requirements

### Requirement: REQ-181 — The agent panel on the right: a plan before anything is written

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL show, on the right of the workbench as the board "IDE · Banco de trabajo" draws it, the agent panel — its header "AGENTE" with the agent and its mode and a "?" — and SHALL show for each request, before anything is written, a card "[ PLAN · NADA ESCRITO AÚN ]" naming each file the agent will change, marked M for changed and + for new, and the specgate command it will run after.

> Brief: "On the right of the workbench, the agent panel shows, before anything is written, "[ PLAN · NADA ESCRITO AÚN ]" with the files it will change and the command it will run."

#### Scenario: SCN-541 — The plan for REQ-031, on the desktop

- GIVEN sprich in the desktop app, its agent `claude`, `docs/specs/changes/draft-pedidos/specs/pedidos/spec.md` open on REQ-031
- WHEN the Developer sends "Que se pueda cancelar hasta 24 h antes del envío @REQ-031"
- THEN the Developer sees the request on the right, then "[ PLAN · NADA ESCRITO AÚN ]" with M `changes/draft-pedidos/specs/pedidos/spec.md`, M `changes/draft-pedidos/questions.md` and + `features/pedidos/REQ-031.feature`, and "specgate draft --check pedidos" as what runs after — and no file of sprich has changed

#### Scenario: SCN-542 — The same panel in English, in the browser

- GIVEN sprich in the browser, in English
- WHEN the Developer opens any view
- THEN the Developer sees the agent panel on the right, headed "AGENT" with `claude` and its "?", under it the input, and the views' content between the side panel and it

### Requirement: REQ-182 — The plan applied only after its diff and a confirmation; discarded; the diff kept in Changes

<!-- specgate:trace actor=Developer kind=business-rule -->

The system SHALL apply an agent's plan only after the Developer presses "Ver el diff y aplicar", sees the diff of every file, and confirms; "Descartar" SHALL drop the plan and write nothing; an applied plan's diff SHALL stay in Changes under its change; and the panel SHALL say, for every plan, what the agent read and the tokens it used.

> Brief: "The agent's plan is applied only after "Ver el diff y aplicar" and a confirmation, "Descartar" drops it, the diff stays in Changes, and the panel says what the agent read and the tokens it used."

#### Scenario: SCN-543 — Applied after its diff, on the desktop

- GIVEN sprich in the desktop app with the plan for REQ-031 shown, and "Leídos: brief.md § pedidos, questions.md, spec.md · 3,1 k tokens" under it
- WHEN the Developer presses "Ver el diff y aplicar", reads the three files' diff and confirms
- THEN the three files are written as the diff showed, the notice names them and `specgate draft --check pedidos`, and Changes shows the diff under draft-pedidos

#### Scenario: SCN-544 — Discarded, in the browser

- GIVEN sprich in the browser with the plan for REQ-031 shown
- WHEN the Developer presses "Descartar"
- THEN the plan goes, no file of sprich is written, and the notice says nothing was written

#### Scenario: SCN-545 — The diff seen and not confirmed, on the desktop

- GIVEN sprich in the desktop app with the plan's diff open
- WHEN the Developer cancels the confirmation
- THEN no file is written and the plan stays with "Ver el diff y aplicar" and "Descartar"

### Requirement: REQ-183 — Ask the project's agent, @ naming a requirement or a file

<!-- specgate:trace actor=Reviewer kind=functional -->

The system SHALL take a request from an input labelled "Pide algo sobre la spec; @ nombra un requisito o un archivo", offer the requirements and files of the project when "@" is typed, and send the request to the project's agent through `specgate agent ask "<request>" --plan --json`, its command shown in the terminal as every command the studio runs; the studio SHALL only show the plan and its diff and confirm it — specgate writes it with `specgate agent apply <plan-id> --json` and checks it.

> Brief: "The Developer and the Reviewer ask the agent from an input that reads "Pide algo sobre la spec; @ nombra un requisito o un archivo"; the agent is the project's, run through specgate."

#### Scenario: SCN-546 — The Reviewer asks about pedidos, on the desktop in Spanish

- GIVEN the Reviewer in sprich in the desktop app, in Spanish
- WHEN the Reviewer types "¿Qué falta para aprobar pedidos?" in "Pide algo sobre la spec; @ nombra un requisito o un archivo" and sends it
- THEN the Reviewer sees the request on the right, the agent's answer or plan under it, and in the terminal the specgate command that ran it

#### Scenario: SCN-547 — @ offers REQ-031, in the browser

- GIVEN the Reviewer in sprich in the browser
- WHEN the Reviewer types "@REQ-03" in the agent's input
- THEN the Reviewer sees REQ-031 and REQ-034 offered with their titles, and choosing REQ-031 puts "@REQ-031" in the request

### Requirement: REQ-184 — The bottom panel always there: TERMINAL, GATE, PROBLEMAS, SALIDA DEL AGENTE, TRAZABILIDAD

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL show the bottom panel on every view, always, with the tabs TERMINAL — a real terminal of the Developer's shell — GATE, PROBLEMAS, SALIDA DEL AGENTE and TRAZABILIDAD, and on its right the shell's name, the folder it runs in and "+", which opens a new terminal; the panel MAY be resized, never removed.

> Brief: "The bottom panel is always there with TERMINAL, GATE, PROBLEMAS, SALIDA DEL AGENTE and TRAZABILIDAD, and on its right the shell, the folder and "+"."

#### Scenario: SCN-548 — Questions with the panel, on the desktop

- GIVEN sprich in the desktop app, in Spanish, with no file and no terminal open
- WHEN the Developer opens Questions
- THEN the Developer sees the bottom panel with TERMINAL, GATE, PROBLEMAS, SALIDA DEL AGENTE and TRAZABILIDAD, and on its right "zsh · ~/mvp/sprich" and "+"

#### Scenario: SCN-549 — "+" opens a terminal, in the browser

- GIVEN sprich in the browser with the bottom panel showing
- WHEN the Developer presses "+"
- THEN the Developer sees a new terminal in sprich's folder, its shell's prompt ready

### Requirement: REQ-185 — No folder open: "No folder opened", "Open Folder" and "Clone Repository"

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL show, when no folder is open, in the Explorer's side panel "No folder opened", a line that explains it, and the buttons "Open Folder" and "Clone Repository", each with its "?"; "Open Folder" SHALL open the chosen folder as the project, and "Clone Repository" SHALL clone a repository into a folder the Developer chooses — with `gh repo clone` when the GitHub CLI is signed in, `git clone` otherwise, the command shown in the terminal — and open it.

> Brief: "When no folder is open, the Explorer says "No folder opened" with "Open Folder" and "Clone Repository" and a line that explains them."

#### Scenario: SCN-550 — The studio opens with no folder, on the desktop

- GIVEN the desktop app started with no folder
- WHEN the Developer chooses Explorer
- THEN the Developer sees "No folder opened", "You have not yet opened a folder.", "Open Folder", "Clone Repository" and the line saying a repository is cloned into a folder and opened

#### Scenario: SCN-551 — Open Folder opens sprich, in the browser

- GIVEN the studio in the browser with no folder open
- WHEN the Developer presses "Open Folder" and chooses `~/mvp/sprich-platform/sprich`
- THEN the Developer sees sprich's Explorer with its root "sprich" and sprich's Home

#### Scenario: SCN-572 — Clone Repository with the GitHub CLI, on the desktop

- GIVEN the desktop app with no folder open and the GitHub CLI signed in
- WHEN the Developer presses "Clone Repository", gives `rsaglobaltech/sprich` and chooses `~/mvp`
- THEN the Developer sees `gh repo clone rsaglobaltech/sprich` run in the terminal into `~/mvp/sprich`, then sprich opened

### Requirement: REQ-186 — The whole project under its root: dot folders included, ignored ones dimmed

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL show, when a folder is open, the whole project as a tree under a root named after the project, below the spec explorer and the modules; folders and files whose name starts with a dot SHALL be shown, and what `.gitignore` or the studio's ignore rules name SHALL be shown dimmed — never hidden — and read only when opened.

> Brief: "When a folder is open, the Explorer shows the whole project under a root named after it, dot folders included, and what is ignored dimmed, never hidden, below the spec explorer and the modules."

#### Scenario: SCN-552 — sprich's root, on the desktop

- GIVEN sprich in the desktop app, with `.claude`, `.github`, `.idea` and `node_modules` in its folder and `.idea/` named in `.gitignore`
- WHEN the Developer chooses Explorer
- THEN the Developer sees under the spec explorer and the modules the root "SPRICH" with `.claude`, `.github`, `.idea`, `node_modules` and the rest, `.idea` and `node_modules` dimmed

#### Scenario: SCN-553 — node_modules opened, in the browser

- GIVEN sprich in the browser with `node_modules` dimmed and closed
- WHEN the Developer opens `node_modules`
- THEN the Developer sees its folders, dimmed, read only now

### Requirement: REQ-187 — An icon for each kind of folder and file, as an icon theme

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL show on each folder of the tree a coloured folder icon of its kind — docs, src, test, features, .github, node_modules, scripts, dist and bin among them — opened or closed as the folder is, and on each file the icon of its kind — .gitignore, LICENSE, package.json, CHANGELOG.md, AGENTS.md, YAML and ESLint configuration among them — and a generic folder or file icon for a kind it does not know; the icons SHALL be the studio's own, drawn as the activity bar's (strokes of 1.8, round caps) with each kind's accent colour from the design tokens, shipped inline as SVG with no network.

> Brief: "Each folder and file shows the icon of its kind, as an icon theme does."

#### Scenario: SCN-554 — sprich's root, its icons, on the desktop

- GIVEN sprich in the desktop app with `docs`, `src`, `test`, `features`, `.github`, `node_modules`, `package.json`, `LICENSE`, `.gitignore` and `AGENTS.md`
- WHEN the Developer chooses Explorer
- THEN the Developer sees each with the icon of its kind, `docs` and `src` with their folder colours, and `docs` showing its open folder icon once opened

#### Scenario: SCN-555 — A kind it does not know, in the browser

- GIVEN sprich in the browser with a file `notes.xyz`
- WHEN the Developer opens its folder
- THEN the Developer sees `notes.xyz` with the generic file icon

### Requirement: REQ-188 — Split the editor right, left, down or up, five ways

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL split the active editor group right, left, down or up — into as many groups as the Developer makes, nested in any grid — — opening the active file in the new group — from the tab's context menu, from the split button at the right of the tab strip, from the palette, with Ctrl/Cmd+\ (right) and Ctrl/Cmd+K then an arrow key (that direction), and by dragging a tab to an edge of an editor group, where an overlay shows the half the tab will take before it is dropped.

> Brief: "The editor splits right, left, down and up from a tab's menu, the split button in the tab strip, the palette, Ctrl/Cmd+\ and Ctrl/Cmd+K then an arrow, or by dragging a tab to an edge of a group, where an overlay shows where it lands."

#### Scenario: SCN-560 — REQ-031 left, its feature right, on the desktop

- GIVEN sprich in the desktop app with REQ-031's spec open and `features/pedidos/REQ-031.feature` open in the same group
- WHEN the Developer drags the tab of `REQ-031.feature` to the right edge of the group, sees the overlay over its right half, and drops it
- THEN the Developer sees REQ-031's spec in the left group and `REQ-031.feature` in a new right group, each with its own tab strip

#### Scenario: SCN-561 — Ctrl+\ and Ctrl+K then Down, in the browser

- GIVEN sprich in the browser on Windows with `spec.md` open in one group
- WHEN the Developer presses Ctrl+\, then Ctrl+K followed by the down arrow
- THEN the Developer sees three groups: the first on the left, a second on the right, and a third under the second, each showing `spec.md`

#### Scenario: SCN-562 — From the tab's menu and the palette, on the desktop

- GIVEN sprich in the desktop app with `docs/brief.md` open
- WHEN the Developer chooses "Split Up" in its tab's menu, then "Split Editor Left" in the palette
- THEN the Developer sees `docs/brief.md` in a group above the first and in a group left of the active one

### Requirement: REQ-189 — Editor groups: their own tabs, one file in sync, moved tabs, focus and splitters

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL give each editor group its own tabs; SHALL keep a file open in two groups as one document — an edit in one shows in the other, saved once; SHALL move a tab to another group when it is dragged onto that group's tab strip; SHALL close a group when its last tab closes; SHALL focus a group on a click or with Ctrl/Cmd+1, 2 or 3; and SHALL resize the groups by their splitters, a double-click on a splitter evening the groups beside it.

> Brief: "Each editor group has its own tabs; the same file may be open in two groups and stays in sync, a tab moves between groups, closing a group's last tab closes the group, Ctrl/Cmd+1, 2 or 3 focuses a group, and splitters resize the groups, a double-click evening them."

#### Scenario: SCN-563 — One spec in two groups, on the desktop

- GIVEN sprich in the desktop app with REQ-031's spec open in the left and the right group
- WHEN the Developer types in the left group
- THEN the Developer sees the same text appear in the right group, both tabs marked unsaved, and one save writes the file once

#### Scenario: SCN-564 — The last tab closed, in the browser

- GIVEN sprich in the browser with two groups, the right one holding only `REQ-031.feature`
- WHEN the Developer closes `REQ-031.feature`
- THEN the Developer sees one group, filling the editor area

#### Scenario: SCN-565 — Focus and the splitter, on the desktop

- GIVEN sprich in the desktop app with two groups, the left one 70 % wide
- WHEN the Developer presses Ctrl/Cmd+2, then double-clicks the splitter between them
- THEN the Developer sees the right group active, then both groups 50 % wide

### Requirement: REQ-190 — The panel at the bottom, right or left, maximized; the agent panel and the side bar hidden, shown and resized

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL place the bottom panel at the bottom, on the right or on the left, and SHALL maximize it over the editor and restore it; and SHALL hide, show and resize the side bar and the agent panel, the panel never hidden (REQ-184).

> Brief: "The bottom panel can sit at the bottom, on the right or on the left and be maximized; the agent panel and the side bar can be hidden, shown and resized."

#### Scenario: SCN-566 — The panel on the right, on the desktop

- GIVEN sprich in the desktop app with the panel at the bottom
- WHEN the Developer chooses "Panel Position: Right" in the palette, then maximizes the panel
- THEN the Developer sees the panel right of the editor groups, then over the editor area, and restores it with the same button

#### Scenario: SCN-567 — The agent panel hidden and the side bar resized, in the browser

- GIVEN sprich in the browser with the side bar and the agent panel shown
- WHEN the Developer hides the agent panel and drags the side bar's edge to 400 px
- THEN the Developer sees the editor groups take the agent panel's room and the side bar 400 px wide

### Requirement: REQ-191 — The layout saved per project and restored; small windows collapse it without losing it

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL save each project's layout — its editor groups and their sizes, the tabs open in each and the active one, the panel's position and size, the side bar's and the agent panel's widths and whether they show — and SHALL restore it when the project is opened again, in the desktop app and in the browser alike; a window too small for it SHALL collapse it — groups stacked into tabs, the side bar and the agent panel to their bars — without changing what is saved.

> Brief: "When a project is opened again, its layout — groups, sizes, open tabs and the panel's position, saved per project — comes back, and a small window collapses it without losing it."

#### Scenario: SCN-568 — sprich reopened, in the browser

- GIVEN sprich in the browser closed with REQ-031's spec left, `REQ-031.feature` right, the panel on the right
- WHEN the Developer opens sprich again
- THEN the Developer sees the same two groups with the same tabs and sizes and the panel on the right

#### Scenario: SCN-569 — A narrow window, on the desktop

- GIVEN sprich in the desktop app with two groups side by side, the side bar and the agent panel shown
- WHEN the Developer narrows the window to 800 px, then widens it to 1440 px again
- THEN the Developer first sees one group with both files as tabs, the side bar and the agent panel collapsed to their bars, then the two groups and both panels as they were

### Requirement: REQ-192 — Splitters by keyboard, the right roles, and a "?" with notices for every split

<!-- specgate:trace actor=Reviewer kind=functional -->

The system SHALL let each splitter take the keyboard focus and move by the arrow keys, give each tab strip the role of a tab list and each splitter the role of a separator with its value, and give each split action — split, move, close a group, panel position, maximize — its "?" and its notice in English and Spanish.

> Brief: "Splitters are reached by keyboard and resized with the arrow keys, with the roles of tab lists and separators, and each split action has its "?" and its notice in English and Spanish."

#### Scenario: SCN-570 — The Reviewer resizes by keyboard, on the desktop

- GIVEN the Reviewer in sprich in the desktop app with two editor groups
- WHEN the Reviewer tabs to the splitter between them and presses the right arrow three times
- THEN the Reviewer sees the left group wider by three steps, and a screen reader hears a separator with its new value

#### Scenario: SCN-571 — The "?" of Split Editor Right in Spanish, in the browser

- GIVEN the Reviewer in sprich in the browser in Spanish
- WHEN the Reviewer presses the "?" beside "Dividir el editor a la derecha" in the tab's menu
- THEN the Reviewer sees under "[ POR DEBAJO ]" that it opens the file in a new group on the right, writes no file and runs no command

