---
product: Specgate Studio — Build and Live as the boards draw them
surfaces: [desktop, web]
actors:
  - { name: Developer, surfaces: [desktop, web] }
modules: [live-polish]
---

# Specgate Studio — Build and Live, after the first build from the studio

The person who owns the studio watched it build REQ-141 live and found it hard
to use: Live listed raw shell commands, the agent's output was empty while the
agent read files, the module map ran over the content, the side panel scrolled
sideways, Build's list hid each requirement's title, the agent panel could not
be reopened once closed, REQ-000 was offered as if it were work to build, and
Build still said "No hay agente" after the agent was set. The boards
"IDE · En vivo" (`docs/design/IDE-EnVivo.dc.html`), "IDE · Construir"
(`docs/design/IDE-Construir.dc.html`) and "IDE · Banco de trabajo"
(`docs/design/IDE.dc.html`) are the reference. The evidence is four
screenshots of that demo: the list, the uncommitted files, Live empty and Live
overlapping.

## Module: live-polish

Live as the "En vivo" board draws it, the agent panel always reachable, and a layout that never overlaps.

Rules

- While a build runs, Live shows the harness's stages for each requirement — "Rama creada", the setup, "intento N de M", "Agente escribiendo · test primero, después el código" with a running timer, "Gate: validate", "Gate: tests", "Gate: arquitectura" and "Aplicar · commit en su rama" — each with ✓, ●, ○ or ✗ and its time; a header with passed, running and failed counts, the time elapsed, tokens, cost, "Parar tras este requisito" and "Parar ya…"; the modules and the queue with estimates on the left; NECESITA ATENCIÓN and TERMINADOS with time and cost on the right.
- While the agent works, SALIDA DEL AGENTE shows one timestamped line per action — read, edit with the lines added, run with the tests passing or failing, ask — with the full command on hover or when expanded, and follows the end unless the Developer scrolls up ("sigue el final · sube para pausar").
- When the agent panel is closed, a visible button in the activity bar, an "Agente" item in the status bar, Ctrl/Cmd+Alt+B and the palette reopen it.
- At 1440×900 and at 1280×800, no view shows two controls or panels over each other, a column left empty after a panel is resized or closed, or a side panel that scrolls sideways.
- When Build lists what is ready, each requirement shows its title with its estimate below it, and REQ-000, the adoption baseline, appears only once the Developer names it.
- When no agent is set, Build offers "Configurar agente", which runs `specgate agents init --tool claude` after a confirmation, and Build follows `harness.config.yaml` without a reload.
- When the Developer commits uncommitted work before a build, the dialog shows a labelled message field, and Confirm says why it is disabled until a message is written.

Examples

- The one where REQ-141 builds and Live shows "Rama creada ✓ 0,2 s", the setup `npm ci` done in 4,5 s, and "Agente escribiendo" with its timer at 3:41.
- The one where the agent reads `features/auth/REQ-012.feature`, edits `packages/core/test/auth/SignOut.test.ts` with 42 lines, and runs `pnpm test SignOut` with 1 failing, then 3 passing.
- The one where the agent panel was closed and the Developer clicks "Agente" in the status bar.
- The one where Build lists "141 · A settings editor with search, and two scopes: project and user" with "~6 min" below it.

Questions

- Which specgate event gives the lines an edit added and the tests a run passed, so the studio need not read them from the agent's text?
