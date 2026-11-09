# Roadmap

Each phase is one brief, drafted module by module with specgate, built test
first, and archived before the next brief becomes `docs/brief.md`.

| Phase | Brief | Modules | Done when |
|---|---|---|---|
| 1 · Foundation | `docs/brief.md` | core-host, specgate-port, workspace, workbench, editor, terminal, help | The studio opens a specgate project in the browser, shows it in the workbench, edits the spec, runs `check` in its terminal, explains every action, within the budgets of ADR-0002 |
| 2 · The specgate flow | `docs/briefs/phase-2-specgate-flow.md` | brief, changes, questions, build-live, project-setup | From an empty folder to a built, proven requirement without leaving the studio |
| 3 · Proof, settings, desktop | `docs/briefs/phase-3-proof-and-desktop.md` | traceability, report, settings, desktop | Signed installers for macOS, Windows and Linux; the report for the client |

Alongside, in the specgate repository:

- `--json` for every command the studio uses (specgate-port).
- A public in-process API, `@rsaglobaltech/specgate/api` (ADR-0003).

Design: the canvas "Specgate Studio — rediseño", row "Studio IDE"
(https://claude.ai/artifact/GGVsRUxhjQURgup7uXXiZT).
