# Proposal: draft-workbench-v2

## Intent

The workbench as the canvas session "Studio IDE — rediseño v2: specgate como un IDE" draws it — above all the board "IDE · Banco de trabajo: requisito, terminal y agente" (`docs/design/IDE.dc.html`) and the canvas notes i1 … i6 (`docs/design/canvas.json`). The person who owns the studio looked at it and it does not look like the design; two earlier decisions contradict the board and are reversed:

- the agent panel on the right is in (note i3, like Kiro, with specgate's gate below) — draft-design-conformance Q1 had left it for later;
- the bottom panel is always there (note i1) — REQ-172 hid it until it held something.

And the Explorer behaves as VS Code's: "No folder opened", the whole project under a root, dot folders, ignored folders dimmed, an icon theme.

## Scope

ADDED (REQ-181 … REQ-187): the agent panel and its plan (REQ-181), applied only after its diff and a confirmation (REQ-182), asked with @ mentions (REQ-183); the bottom panel always there (REQ-184); no folder open (REQ-185); the whole project under its root with ignored entries dimmed (REQ-186); an icon theme (REQ-187); editor splits in four directions five ways (REQ-188), editor groups (REQ-189), the panel's position and the side bars (REQ-190), the layout saved per project (REQ-191), splitters by keyboard with their roles and "?" (REQ-192).

MODIFIED: REQ-172 (draft-design-conformance) drops its empty-panel rule; REQ-167 (draft-explorer-tree) shows ignored files dimmed instead of hiding them.

Out of scope: a chat history across sessions, several agents at once, the agent writing code (the plan of the board changes the draft, not the code), and every other board.

## Approach

The agent panel is a view of the host: the request goes to the project's agent through specgate (A5, Q2 — the command specgate lacks is named), the plan comes back as data, and nothing is written before the Developer confirms its diff; writes go through the host's file port as the tree's do. The bottom panel is the workbench's panel, never hidden. The Explorer reads the root's entries with ignored ones marked, and maps names to the icon theme's SVGs shipped with the UI (Q1).

This change modifies requirements of draft-design-conformance and draft-explorer-tree (PR #22): it is reviewed after them, and its branch starts from theirs.
