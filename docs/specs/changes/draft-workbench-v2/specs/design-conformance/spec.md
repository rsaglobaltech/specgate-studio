# Delta — design-conformance

## MODIFIED Requirements

### Requirement: REQ-172 — A frame with its bottom panel always there: the menu bar, the gate pill in its colour, a primary Build, and a status bar of the open view

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL hide the tab strip unless a file is open, and SHALL keep the bottom panel on every view (draft-workbench-v2 REQ-184); it SHALL offer the menu bar — the operating system's menu in the desktop app, a bar in the page's header in the browser — and SHALL show in the header the gate pill in the gate's colour and a primary Build, and in the status bar what the open view counts.

> Brief: "The bottom panel is always there with TERMINAL, GATE, PROBLEMAS, SALIDA DEL AGENTE and TRAZABILIDAD, and on its right the shell, the folder and "+"."

#### Scenario: SCN-513 — Questions with nothing open, on the desktop

- GIVEN sprich in the desktop app with no file open and no terminal, Q1 and Q2 open and Q4 to confirm
- WHEN the Developer opens Questions
- THEN the Developer sees no tab strip, the bottom panel with its five tabs, and the status bar reading "2 open · 1 to confirm"

#### Scenario: SCN-514 — The header after a green gate, in the browser

- GIVEN sprich in the browser, its last gate passed
- WHEN the Developer opens Home and chooses Terminal in the menu bar, then "New terminal"
- THEN the Developer sees the menu bar File, Spec, Build, Terminal, Help, the pill "Gate green" in green, the primary "Build", and a new terminal in the bottom panel
