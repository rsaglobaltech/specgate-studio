# Assumptions — draft-workbench

What the brief does not say, chosen so the scenarios can be tested. Each is to
confirm by the person reviewing the draft.

| # | Assumption | Used in | Why | Status |
|---|---|---|---|---|
| A1 | The example project is sprich at `~/mvp/sprich-platform/sprich`, on the branch `feat/mvp-fase-1`, with no ticket in the branch name | REQ-031 … REQ-036 | The real project the studio is measured on (draft-core-host A6); its branch today | to confirm |
| A2 | The browser runs the same UI bundle from `specgate-studio serve` (`http://127.0.0.1:4180`, draft-core-host A2) | REQ-031 … REQ-036 | One UI for both surfaces (ADR-0002) | to confirm |
| A3 | The activity bar is the canonical one of the canvas "Specgate Studio — rediseño", row "Studio IDE": the same icons and order on all 13 boards | REQ-031 | The design the brief names | to confirm |
| A4 | "The open view marked" is a highlighted icon with an accent bar, as in VS Code and the canvas | REQ-031 | Familiar to VS Code users | to confirm |
| A5 | The status bar shows the gate as its last result (passed, failed, not run), the progress as requirements done of the total (for example "13 of 14"), and the cost as the agent spend of the session; "no ticket" is shown when the branch names none | REQ-032 | What each field means is not in the brief; the ticket comes from the branch (workspace) | to confirm |
| A6 | The bottom panel's Traceability tab is a compact list; the full view is the activity bar's Traceability | REQ-032 | The brief names Traceability in both places | to confirm |
| A7 | Each palette entry shows its title in the chosen language and the specgate command it runs (for example `specgate propose --from-ticket <KEY>`); an entry that runs no specgate command (such as switching the theme) shows none | REQ-033 | "The command it runs" is the specgate command each feature wraps | to confirm |
| A8 | The palette matches the typed text anywhere in the title or the command, case-insensitively, in the chosen language and in English | REQ-033 | So "ticket" finds the feature in Spanish too | to confirm |
| A9 | F1 also opens the palette, as in VS Code, because some browsers keep Cmd+Shift+P for themselves (Firefox: a private window) | REQ-033 | The palette must open in every supported browser | to confirm |
| A10 | Language and theme are in Settings and in the palette; the choice is remembered per Developer on that machine, and the first language follows the system's (Spanish or English, English otherwise) | REQ-034 | Not in the brief; the dark default is | to confirm |
| A11 | The Spanish labels of the views are Inicio, Explorador, Brief, Cambios, Preguntas, Construir, En vivo, Trazabilidad, Informe, Ayuda, Configuración | REQ-034 | The canvas's Spanish boards | to confirm |
| A12 | "Visible" is the first paint of the workbench with its activity bar; "interactive" is the palette or a view answering a key or a click; both are measured in CI on the Linux runner (ADR-0002) | REQ-035 | The budgets of ADR-0002, checked in CI | to confirm |
| A13 | The view-switch time is measured from the click on the activity bar to the view's first paint, with the project already read (REQ-004 of core-host answers its data in under 50 ms) | REQ-036 | The brief's 50 ms is the UI's; the data's 50 ms is core-host's | to confirm |
| A14 | Lists render only the rows on screen (virtualised), so 5,000 rows scroll at 60 fps on the CI runner and on a 2020 laptop | REQ-036 | The only way a webview keeps 60 fps at that size | to confirm |
| A15 | Every view, tab and panel has the "?" of the help module; this draft does not specify it | REQ-031 … REQ-034 | The help module of the brief | to confirm |
