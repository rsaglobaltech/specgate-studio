---
product: Specgate Studio — an IDE for spec-driven development, with specgate underneath
surfaces: [desktop, web]
actors:
  - { name: Developer, surfaces: [desktop, web] }
  - { name: Reviewer, surfaces: [desktop, web] }
modules: [core-host, specgate-port, workspace, workbench, editor, terminal, help]
---

# Specgate Studio — phase 1: the foundation

Specgate Studio is an IDE that feels like VS Code but does one job: take a
project from a brief to proven, built requirements with specgate. Every
feature runs a specgate command, shows that command, and says what it wrote,
ran, committed or pushed. It must feel faster than VS Code: it opens one
project, knows specgate's files, and never runs a process it could avoid.

It installs as a desktop app (macOS, Windows, Linux) and the same UI runs in a
browser with `specgate-studio serve`. The design lives in the canvas "Specgate
Studio — rediseño", row "Studio IDE".

Architecture is hexagonal (ADR-0001): a domain and its use cases in plain
TypeScript with no dependencies, ports for everything outside, adapters for
specgate, git, the file system, the terminal, the agent and the window.

This brief is phase 1, the foundation. Phase 2 (the specgate flow) and phase 3
(proof, settings and the desktop app) wait in `docs/briefs/` and become
`docs/brief.md` in turn (docs/roadmap.md).

## Module: core-host

The long-lived process that holds the project's state and serves the UI.

Rules

- When a Developer opens a project, one core host starts for it, and the UI talks to it over a typed JSON-RPC transport.
- When the project is first read, its state (requirements, changes, questions, matrix, gate) is kept in memory.
- When a file of the specification changes, only the parts of the state that file feeds are read again.
- After the first read, a section's data is answered in under 50 ms.
- When the host runs a command, the UI can follow it as events: started, output, ended with its exit code.
- While a write command runs, a second one is refused, naming the one that runs.
- The host passes arguments as an array and never runs a shell.

Examples

- The one where `status` takes 1.9 s on the first read of sprich and 20 ms after it.
- The one where `docs/specs/changes/draft-pedidos/questions.md` is saved and only Questions and the matrix are read again.

Questions

- Is the transport WebSocket for both desktop and web, or stdio for the desktop sidecar?

## Module: specgate-port

How the studio uses specgate: one port, two adapters.

Rules

- The core depends on a `SpecgatePort` interface only, never on the specgate package.
- The first adapter runs the specgate CLI with `--json` and parses its output.
- When the host starts, it checks the installed specgate version against the one it needs.
- Once specgate publishes a public API, a second adapter calls it in process.
- Both adapters pass the same contract tests.
- When the UI asks for a command the port does not offer, it is refused before anything runs.

Examples

- The one where the installed specgate is 0.29.1 and the studio needs 0.30.0: the Developer is told so and how to update.
- The one where `apply REQ-007` is refused and the port returns the finding `apply_no_test` with its fix.

Questions

- Which specgate commands lack a `--json` output today?

## Module: workspace

The open project: its folder, files, git state and watcher.

Rules

- When a Developer opens a folder, the studio says whether it is empty, has code, or is a specgate project.
- The file watcher ignores `node_modules`, `.git` and build folders, and keeps up with 50,000 files.
- The git state shows the branch, the ticket and team a branch names (`feature/<team>/<KEY>`), and the uncommitted files grouped by folder.
- The studio remembers each Developer's last 10 projects.

Examples

- The one where sprich has 325 uncommitted files: 129 under packages/core, 96 under apps/web, 84 of the specification.

Questions

- Should several projects open at once, one window each?

## Module: workbench

The VS Code-like frame.

Rules

- On every screen, an activity bar with the same eleven views in this order: Home, Explorer, Brief, Changes, Questions, Build, Live, Traceability, Report; Help and Settings at the bottom.
- Editor tabs, a bottom panel (Terminal, Gate, Problems, Agent output, Traceability) and a status bar with branch, ticket, gate, progress and cost.
- When a Developer presses Ctrl/Cmd+Shift+P, a command palette lists every feature with the command it runs.
- When a Developer chooses a language or a theme, the studio switches between Spanish and English, and between dark (the default) and light.
- On a cold start the window is visible in under 300 ms and interactive in under 1 s.
- Switching views takes under 50 ms; lists of 5,000 rows scroll at 60 fps.

Examples

- The one where a Developer types Ctrl+Shift+P, "ticket", Enter and "Open a change from a ticket" opens.

Questions

- Which VS Code shortcuts must work from day one?

## Module: editor

Editing the specification as code.

Rules

- When a file is first opened, the Monaco editor loads; not before.
- Above each requirement: Build, Check, Trace, Ask for a change, and a help button.
- Findings of the gate and the brief check are underlined where they are, with their fix.
- When a question blocks a requirement, it shows inline under it, with its options, for the Reviewer to answer.
- Saving writes the file; nothing else is written without the person.

Examples

- The one where REQ-031's "until it is shipped" is underlined because Q2 is open.

Questions

- CodeMirror 6 instead of Monaco if Monaco breaks the startup budget?

## Module: terminal

A real terminal inside the studio.

Rules

- A pty in the project's folder, with the Developer's shell, on macOS, Windows and Linux.
- When the studio runs a command, it is echoed in the terminal with the button that started it.
- Several terminals at once; each keeps its scrollback.

Examples

- The one where "Check" prints `specgate check` and its stages in the terminal.

Questions

- Is the pty in Rust (Tauri) and in node-pty for the web host?

## Module: help

The studio says what everything does.

Rules

- Every feature that writes, runs, commits, pushes or sends has a "?" with: what it does, the command, the files it changes, what it does not do, what comes next.
- When an action ends, its notice says what was written or run and the next step; never only "done".
- When an action has no explanation in both languages, the project's tests fail.

Examples

- The one where the "?" beside Ask for a change tells the Reviewer the request goes to review.md and the draft changes only when drafted again.

Questions

- None.
