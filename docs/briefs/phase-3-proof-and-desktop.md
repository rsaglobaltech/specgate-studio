---
product: Specgate Studio — proof, settings and desktop
surfaces: [desktop, web]
actors:
  - { name: Developer, surfaces: [desktop, web] }
  - { name: Reviewer, surfaces: [desktop, web] }
modules: [traceability, report, settings, desktop]
---

# Specgate Studio — phase 3: proof, settings and the desktop app

Traceability, the report, settings and the installable desktop app. Drafted once phase 2 is archived.

## Module: traceability

Rules

- One row per scenario: requirement, feature, test, code, status.
- Filters: gaps, without a test, waiting for an answer.
- "Fix" opens the scenario and proposes the missing test; nothing is written without confirmation.

Examples

- The one where SCN-020b has no test and shows as a gap.

Questions

- None.

## Module: report

Rules

- Built of the total, scenarios proven, coverage, mutation score, cost and time.
- The gate by stage, with the fix of what fails.
- Download as one HTML page; print to PDF.

Examples

- The one where pagos is 2 of 6 with coverage 74 %.

Questions

- None.

## Module: settings

Rules

- A settings editor with search and two scopes: project and user.
- Each project setting says which `specgate config set` command saves it and where.
- Agents and profiles, preferences, agent guards, quality, ALM, editor, terminal, shortcuts, appearance.

Examples

- The one where the test command is saved as `pnpm test` in harness.config.yaml.

Questions

- None.

## Module: desktop

Rules

- Tauri 2 shell; the core host runs as a sidecar with its own Node runtime, no Node installed needed.
- Signed installers for macOS (.dmg), Windows (.msi) and Linux (.AppImage, .deb), and auto-update.
- Idle memory under 200 MB; installer under 80 MB.
- The same UI runs in a browser with `specgate-studio serve`.

Examples

- The one where the studio opens sprich in 0.8 s on a cold start.

Questions

- Which code-signing certificates do we have for macOS and Windows?
