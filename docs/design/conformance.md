# Design conformance — the studio against the approved IDE boards

Audited 2026-11-11 on `origin/main` (97baf06), specgate 0.33.2, by running
`specgate-studio serve` on a scratch project (`specgate init --yes --new`, a
change `add-login` with REQ-001/REQ-002, an open question Q1 blocking REQ-002,
one modified and one untracked file) and on an empty folder. Every view was
captured with Playwright's Chromium at 1440×900; each board of the canvas
"Specgate Studio — rediseño" (`docs/design/*.dc.html`) was rendered the same
way, its `<x-dc>`/`<helmet>` wrapper stripped. Screenshots, resized to 1080 px:
`docs/design/screens/studio/` and `docs/design/screens/design/`.

The boards show sprich with data; the scratch project has little. Differences
that come only from the data (24 vs 3 requirements, a running build) are not
listed. Severity: **high** — the view does not look or work like the board at
a glance; **medium** — a component or state differs; **low** — a detail.

Where a gap is already specified by an open draft, it is named, not drafted
again: `draft-brief` (REQ-071 … 074) and `draft-changes` (REQ-081 … 086) on
main; `draft-traceability`, `draft-report`, `draft-settings` and
`draft-desktop` on `draft/phase-3` and `draft/desktop`. The rest is drafted in
`docs/specs/changes/draft-explorer-tree/` (the file tree) and
`docs/specs/changes/draft-design-conformance/` (the other gaps).

## Across every view

| What | Board | Studio | Severity | Drafted in |
|---|---|---|---|---|
| Fonts | Syne for titles and the wordmark, IBM Plex Sans for text, IBM Plex Mono for code | None of the three is loaded (`document.fonts` is empty): titles and text fall back to the system sans, the wordmark is plain bold | high | design-conformance |
| Bottom panel | Shown only where it holds something (IDE, Cambios, Construir, Brief); Home, Preguntas, Trazabilidad, Informe, Ajustes, Nuevo have none | An empty Terminal panel of ~220 px under every view, with a lone "+" | high | design-conformance |
| Tab strip | Only when files are open | An empty 34 px strip above every view | medium | design-conformance |
| Side panels | `#1C1D22`, 270–290 px, a 36 px uppercase header with its "?" | `#111215` (the bar colour), 240 px, no "?"; only the file list ever uses it | high | explorer-tree, design-conformance |
| List rows | Dot, mono id, title, right-aligned count; current item with the orange inset and `#2A2622` | Plain text rows; current with a grey fill | medium | explorer-tree, design-conformance |
| Header | Wordmark, menu bar (Archivo, Spec, Construir, Terminal, Ayuda), search, gate pill coloured by state ("Gate verde"), a primary "Construir" | Wordmark, search, a neutral "Gate not run" pill; no menu bar, no "Construir" | medium | design-conformance |
| Status bar | Orange `#B93D0B`, items of the view (e.g. "2 abiertas · 1 por confirmar" in Preguntas), model and cost today, Ln/Col in the editor, language | Orange, the same items on every view: branch, ticket, gate, progress, cost, language | low | design-conformance |
| Block shadow | Next-step card, "?" popover and palette carry an offset orange block shadow (`8px 8px 0 rgb(255 91 31 / 12–16%)`) | Soft drop shadows (`0 16px 40px`) or none | low | design-conformance |
| Radii | 4 px (cards, buttons, inputs), pills 999 px | 4 / 6 / 10 px mixed | low | design-conformance |
| Agent side panel | IDE board: a right "AGENTE" column — the request, a "[ PLAN · NADA ESCRITO AÚN ]" card with the files it would touch, "Ver el diff y aplicar" / "Descartar", what it read, a prompt box | Absent | high | question Q1 of design-conformance (a feature, not a look) |

## Home (Inicio) — high

Board `IDE-Inicio.dc.html` · studio `screens/studio/home.png`.

- Matches: activity bar order and icons, badges on Cambios and Preguntas, the "[ NEXT STEP ]" eyebrow, orange status bar.
- Differs:
  - The next step is a command in mono (`specgate apply REQ-000`), not a sentence in Syne ("Responde 2 preguntas del borrador «pedidos»") with why, a primary button ("Responder ahora") and its "?", on a block-shadow card. **high**
  - Three counters (Requirements, Done, To do) instead of four (Requisitos · 3 en borrador, Construidos · +3 esta semana, Probados · de 15 construidos, Coste del agente · este mes). **medium**
  - No "La ruta" (the seven steps with ✓ / current / to do), no "Módulos" progress bars, no "Actividad" feed. **high**
  - One action ("Check the gate") instead of the row Comprobar el gate · Diagnóstico (doctor) · Nuevo cambio · Desde un ticket · Abrir terminal. **medium**
  - The title has no subtitle (stack · branch · agent). **low**

## Explorer and editor (IDE shell) — high

Board `IDE.dc.html` · studio `screens/studio/explorer.png`, `sidebar.png`, `editor.png`, `editor-spec.png`.

- Matches: editor tabs with the orange top inset and the unsaved dot, line numbers, the requirement actions above each `### Requirement` (REQ-042), a blocking question inline under its requirement (REQ-044), terminal tabs in the panel.
- Differs:
  - The Explorer is a flat list of full paths (`docs/specs/changes/add-login/propo…`, cut off), in the main area when its activity is chosen and in a 240 px side list after Cmd+B; no folders, no expand/collapse, no icons, no git letters, no reveal of the open file, no keyboard, no context menu. The board shows a tree with ▾/▸ folders, type badges (`MD`), `M` in amber on a modified file, counts on folders. **high** → `draft-explorer-tree`
  - The board's explorer is spec-first: "EXPLORADOR DE LA SPEC" (spec.md, docs/brief.md, cambios abiertos with "2 preguntas" / "KAN-13", capacidades (4), features (31)) and below it "MÓDULOS · REQUISITOS 15/24" with each requirement's status dot and a legend (probado, construyendo, espera respuesta, borrador). **high** → question Q3 of `draft-explorer-tree`
  - Tabs show a type badge (`REQ`, `FT`, `TS`, `MD`) and, for a requirement, its id and title ("REQ-031 · Cancelar un pedido"); the studio shows the file name only (`spec.md`, ambiguous between changes). **medium**
  - No breadcrumb (`docs › specs › changes › draft-pedidos › pedidos › REQ-031`). **medium**
  - The actions above a requirement read "▶ Construir · ✓ Comprobar · ⌕ Trazar (1 escenario, 0 pruebas) · ✎ Pedir un cambio · ?" in muted text with icons; the studio prints "Build | Check | Trace | Ask for a change | ?" in orange, without the trace count. **low**
  - The inline question has a header ("Q2 abierta · bloquea REQ-031", source `questions.md · draft-pedidos`), option buttons and the line saying what "Responder" writes; the studio's box has the options and "Answer" only. **medium**
  - The editor theme colours headings blue (Monaco default); the board uses orange headings, purple scenarios and blue keywords. **low**

## Changes (Cambios) — high, mostly in draft-changes

Board `IDE-Cambios.dc.html` · studio `screens/studio/changes.png`.

- Matches: the three groups (to review, in progress, ready to archive), Apply per requirement with its "?".
- Differs:
  - Groups are headings in the main area; the board lists them in a side panel ("CAMBIOS" + "+ Nuevo", dots and counts, a dashed note on what a change is) and shows the selected draft on the right. **high** → design-conformance (layout); content in draft-changes
  - No draft review: requested changes from `review.md`, the before/after diff, "Redactar de nuevo con 2 cambios", "Aprobar…". → draft-changes REQ-082, REQ-083 (open)

## Questions (Preguntas) — medium

Board `IDE-Preguntas.dc.html` · studio `screens/studio/questions.png`.

- Matches: the question, what it blocks, its options, a free answer, the "?".
- Differs:
  - The board lists questions in a side panel grouped "ABIERTAS · 2", "POR CONFIRMAR EN LA SPEC · 1", "DEL AGENTE, MIENTRAS CONSTRUYE · 0" and shows one question large: its id in orange, the change, the blocked REQ as a chip, the title in Syne, where it comes from ("Del brief: …"), option chips, a full-width answer box with the Enter / Shift+Enter hint, "Guardar respuesta" and what it writes. The studio shows cards in one column with a small inline answer field. **medium**
  - "Respondida · confirma que la spec lo dice" is a card of its own on the board. **low**
  - Status bar "2 abiertas · 1 por confirmar". **low**

## Build (Construir) — high

Board `IDE-Construir.dc.html` · studio `screens/studio/build.png`.

- Matches: "who codes", the per-requirement estimate, Build per requirement with its "?".
- Differs:
  - The board has a side panel: "Quién programa" select, "LISTOS · APROBADOS, SIN PREGUNTAS" with checkboxes and estimates, "ESPERAN · NO SE PUEDEN ELEGIR AÚN" with the question that blocks each, and "Construir N requisitos" at the bottom with the reason when it cannot; the main area shows the plan of the selected requirement as five steps (rama, agente, gate, aplicar, commit). The studio lists cards with a Build button each. **high**
  - The dirty-tree card (counts per folder, spec vs code, "Hacer commit y construir" / "Apartar y construir" / "Añadir a .gitignore") is not shown on opening Build, although the scratch project had a modified and an untracked file. **medium**
  - **Behaviour, not design:** REQ-002 is listed under "Ready to build" though Q1 blocks it, and REQ-001/REQ-002 belong to a change that is not approved; REQ-101 says ready means approved, with its scenario, and no blocking question. To check against REQ-101 before drafting anything. **high**

## Live (En vivo) — medium (seen idle only)

Board `IDE-EnVivo.dc.html` · studio `screens/studio/live.png`.

- Differs:
  - Three columns on the board: "POR MÓDULO" tiles and "COLA" on the left; the current requirement with tabs (Pasos, Requisito, Pruebas y archivos, Intentos, Agente), its steps and the agent's output in the middle; "NECESITA ATENCIÓN" (the agent's question with answers) and "TERMINADOS" on the right. The header turns into the build's counters (✓ pasados, ● en curso, ✗ fallidos, time, tokens, cost) with "Parar tras este requisito" and "Parar ya…". The studio shows three cards and an output box in one column. **medium**
  - Idle copy is a long paragraph about `.harness/events/`; the board has no idle state — Estados' loading/empty rules apply. **low**

## Brief — high, in draft-brief

Board `IDE-Brief.dc.html` · studio `screens/studio/brief.png`.

- Differs: the form (product, actors with surfaces, modules as chips, rules, examples, questions, "pegar el texto del cliente") beside the markdown, Problems with the brief's checks and "Redactar los módulos" — the studio has a link to open `docs/brief.md` and the button. → draft-brief REQ-071 … REQ-074 (open). The side-panel look is in design-conformance.

## Traceability, Report, Settings — high, in phase 3

Boards `IDE-Trazabilidad`, `IDE-Informe`, `IDE-Ajustes` · studio `traceability.png`, `report.png`, `settings.png`.

- Traceability is a list of requirements with what they need; the board's table, filters and counters are draft-traceability REQ-121 … 123.
- Report shows one counter, "Requirements 1", while the project has 3 — **a wrong number, not a design gap**; the board's counters, gate by stage and modules are draft-report REQ-131 … 133.
- Settings has language and theme only; the board's sections, search and scopes are draft-settings REQ-141 … 143.

## Command palette (Paleta) — medium

Board `IDE-Paleta.dc.html` · studio `screens/studio/palette.png`.

- Matches: features with the command each runs, the orange inset on the selection, a "?" per row.
- Differs: the board groups features (SPEC, CONSTRUIR Y COMPROBAR, PROYECTO), prompts with "›", has an "Esc" chip, shows the selected feature's "[ POR DEBAJO ]" on the right (what it does, command, writes, git, does not, after), and a footer "↑↓ elegir · Enter ejecutar · ? explicar"; the board has more entries (Pedir un cambio, Aprobar el borrador, Validar un cambio, Diagnóstico, Adoptar esta carpeta, Cambiar una preferencia). The studio shows a flat list without the explanation pane. **medium**

## "?" help — medium

Board: the popover in `IDE-Cambios.dc.html`, the pane in `IDE-Paleta.dc.html` · studio `screens/studio/help-popover.png`, `help.png`.

- Matches: the five parts (what it does, command, files, what it does not, next), English and Spanish.
- Differs: the board's popover opens beside its "?", with the eyebrow "[ POR DEBAJO ]", label/value rows in two columns, "Esc ×", and the block shadow; the studio opens a centred modal with stacked headings and a "Close" button. **medium**
- The Help view (activity bar, bottom) says "This view comes with its module; the workbench frames it now." The boards show no Help view of their own (the shell's "Ayuda" menu and the "Ayuda: qué hace cada vista" button only). **low** — question for the owner, not drafted.

## States (Estados) — high

Board `IDE-Estados.dc.html` · studio `screens/studio/disconnected.png`.

- Differs:
  - Lost connection: the board shows an amber banner "Reconectando con el studio… Nada se pierde" and a grey status bar "sin conexión con el studio · reintentando"; with the host stopped the studio kept showing the last view with no sign of it. **high**
  - Loading: the board's "[ CARGANDO ]" skeleton in the section's shape; the studio's first read was too fast to see one here (to confirm on a large project). **medium**
  - Could not read: "[ NO SE PUDO LEER ]" naming the file and line, "Leer de nuevo", "Abrir la línea 48", "El resto del studio sigue funcionando". Not reproduced. **medium**
  - Notices: success fades, failure stays with "Reintentar" and ×; busy buttons read "Comprobando…" with the steps live below. **medium**

## New project (Nuevo) — medium

Board `IDE-Nuevo.dc.html` · studio `screens/studio/setup.png`, `setup-form.png`.

- Matches: the five questions, the command it runs, its "?".
- Differs: the board puts the questions on Home of an empty folder at once, as option cards (Una web / Un servicio / App móvil; stacks; Claude Code "detectado" / Codex "no instalado" / Otro comando; Básico / Estándar / Estricto), with "¿Ya tienes código? Abrir carpeta…" and "Recientes" beside it; the studio shows a next-step card, then a form of selects with the generated YAML. The board asks the quality level; the studio asks the architecture. **medium**

## After draft-explorer-tree and draft-design-conformance (2026-11-12)

The views again at 1440×900 against a sprich-like fake host, next to their
boards: `docs/design/screens/after/` (after) beside `screens/studio/` (before)
and `screens/design/` (the boards).

| View | Board | After | What closed |
|---|---|---|---|
| Explorer and editor | `design/shell.png` | `after/shell.png` | The tree in the side panel with SPEC EXPLORER and MODULES · REQUIREMENTS above it, types, git letters and dots, the spec marked (REQ-161 … REQ-169); a REQ tab with its id and title and the breadcrumb (REQ-177) |
| Home | `design/inicio.png` | `after/home.png` | The next step as a sentence, four counters, the route, modules, activity, the actions (REQ-173); the fonts and the block shadow (REQ-171); no empty panel or tab strip, the menu bar, the gate pill, a primary Build (REQ-172) |
| Changes | `design/cambios.png` | `after/changes.png` | Grouped in the side panel, the chosen change beside it (REQ-175) |
| Questions | `design/preguntas.png` | `after/questions.png` | Open, to confirm and from the agent in the side panel; the chosen question large; the status bar's count (REQ-175, REQ-172) |
| Build | `design/construir.png` | `after/build.png` | Ready and waiting in the side panel with checkboxes and "Build N requirements"; the plan's five steps beside it (REQ-175) |
| Live | `design/envivo.png` | `after/live.png` | Modules and queue, the requirement with its tabs and output, what needs attention — three columns (REQ-175) |
| Palette | `design/paleta.png` | `after/palette.png` | Grouped by area, "›", Esc, the chosen feature's "[ UNDER THE HOOD ]", the footer keys (REQ-176) |
| "?" | `design/cambios.png` (popover) | `after/help-popover.png` | A popover beside its "?", not a centred dialog (REQ-176) |
| States | `design/estados.png` | `after/states-offline.png` | Reconnecting banner and grey status bar; loading shape; "could not read" with file and line; failures that stay with Retry (REQ-178) |
| New project | `design/nuevo.png` | `after/nuevo.png` | The five questions as cards on Home, "Already have code?", recent projects (REQ-174) |
| Help | — | `after/help.png` | The catalogue of every "?", searchable, in English and Spanish (REQ-179) |

Second pass on the editor and the side panels (shell board):

- Editor: a named theme from the tokens (`studio-dark`, `studio-light`) on a
  `specmd` language — `### Requirement:` in orange, its title bold `#ECE7DE`,
  SHALL blue `#6CB6FF`, GIVEN/WHEN/THEN/AND/BUT as the board's keywords
  (`#B48EFF`), the trace comment dim `#6B8F71`, text `#C9C3B9`, 13 px / 22 px.
- The actions above a requirement: ▶ Build · ✓ Check · ⧉ Trace (1 scenario, 0 tests) · ✎ Ask for a change · "?".
- The inline question: "Q2 open · blocks REQ-031", "questions.md · draft-pedidos", the options, "Another answer…", "?", and the footnote.
- MODULES · REQUIREMENTS: the requirement under the cursor highlighted and in view, its module opened first.
- The spec explorer's root is the project, with "open changes", "capabilities (N)" and "features (N)" each collapsible.
- Tabs: a 7 px dot while unsaved; REQ orange, FT green, TS and MD blue.
- Questions: chips, a full-width answer with "Enter saves", Answer with what it writes. Changes: the draft's line under its title.

Still different, on purpose or for lack of data:

- The agent panel of the shell board is a draft of its own (design-conformance Q1).
- The desktop app's menu is the operating system's (Q2): only the browser draws the bar.
- The empty folder asks the architecture, as REQ-111 does, not the board's quality level (A10).
- Traceability, Report and Settings wait for phase 3's drafts.
- Cards keep 4 px corners as REQ-171 says; the boards draw some at 6 px.
- GIVEN/WHEN/THEN are purple (`#B48EFF`) as the board draws them, not blue; SHALL is blue.
- Changes: the draft's review (requested changes, before/after, "Draft again", "Approve…") is draft-changes REQ-082/083, not built here.
- Questions: the board's "From the brief: «…». The draft assumed 60 €" needs the question's source text, which `specgate questions --json` does not give.
- Live: seen idle only — no running build in the fake; the header counts sit at the top of Live, not in the app header.
- The trace count's tests come from `report --json` (`testExists`: 0 or 1), not a count of every test naming it.
