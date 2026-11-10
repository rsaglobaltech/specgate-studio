# Proposal: draft-workbench

## Intent

The workbench module of the brief (`docs/brief.md`), written down as requirements and
scenarios a person can review before anything is built: the VS Code-like
frame every view of the studio lives in — the same activity bar on every
screen, editor tabs, a bottom panel, a status bar, a command palette that
names the specgate command behind each feature, Spanish and English, dark and
light — within the budgets of ADR-0002.

## Scope

In scope: what the brief says about workbench (REQ-031 … REQ-036).

Out of scope: every other module of the brief. What each view shows is phase
2 and 3; the files and git state the status bar shows are workspace; the
editor inside the tabs is editor; the terminal inside the panel is terminal;
the "?" on every feature is help.

## Approach

`apps/ui` in Preact, one bundle for the desktop webview and the browser
(ADR-0002), importing only `@specgate-studio/protocol` and talking to the core
host over JSON-RPC on a WebSocket (ADR-0001, draft-core-host). The frame is a
shell component with the activity bar, the tabs, the panel and the status
bar; each view is loaded on first open. The palette is built from one registry
of features, each with its titles in both languages and its specgate
command, so the palette, the "?" and the tests read the same list. Lists are
virtualised (A14); the budgets are measured in CI (A12).
