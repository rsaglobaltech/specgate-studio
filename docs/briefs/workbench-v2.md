---
product: Specgate Studio — the workbench as the IDE board draws it
surfaces: [desktop, web]
actors:
  - { name: Developer, surfaces: [desktop, web] }
  - { name: Reviewer, surfaces: [desktop, web] }
modules: [workbench-v2]
---

# Specgate Studio — the workbench of "Studio IDE — rediseño v2"

The canvas session "Studio IDE — rediseño v2: specgate como un IDE" — above
all its board "IDE · Banco de trabajo: requisito, terminal y agente"
(`docs/design/IDE.dc.html`) and its notes i1–i6 (`docs/design/canvas.json`) —
is the reference. Two earlier decisions contradict it and are reversed: the
agent panel on the right is in (note i3), and the bottom panel is always
there (note i1). The Explorer behaves as VS Code's: a "No folder opened"
state, the whole project under a root, icons by kind, ignored folders dimmed.

## Module: workbench-v2

The frame of every view: the agent on the right, the panel at the foot, the Explorer as VS Code's.

Rules

- On the right of the workbench, the agent panel shows, before anything is written, "[ PLAN · NADA ESCRITO AÚN ]" with the files it will change and the command it will run.
- The agent's plan is applied only after "Ver el diff y aplicar" and a confirmation, "Descartar" drops it, the diff stays in Changes, and the panel says what the agent read and the tokens it used.
- The Developer and the Reviewer ask the agent from an input that reads "Pide algo sobre la spec; @ nombra un requisito o un archivo"; the agent is the project's, run through specgate.
- The bottom panel is always there with TERMINAL, GATE, PROBLEMAS, SALIDA DEL AGENTE and TRAZABILIDAD, and on its right the shell, the folder and "+".
- When no folder is open, the Explorer says "No folder opened" with "Open Folder" and "Clone Repository" and a line that explains them.
- When a folder is open, the Explorer shows the whole project under a root named after it, dot folders included, and what is ignored dimmed, never hidden, below the spec explorer and the modules.
- Each folder and file shows the icon of its kind, as an icon theme does.
- The editor splits right, left, down and up from a tab's menu, the split button in the tab strip, the palette, Ctrl/Cmd+\ and Ctrl/Cmd+K then an arrow, or by dragging a tab to an edge of a group, where an overlay shows where it lands.
- Each editor group has its own tabs; the same file may be open in two groups and stays in sync, a tab moves between groups, closing a group's last tab closes the group, Ctrl/Cmd+1, 2 or 3 focuses a group, and splitters resize the groups, a double-click evening them.
- The bottom panel can sit at the bottom, on the right or on the left and be maximized; the agent panel and the side bar can be hidden, shown and resized.
- When a project is opened again, its layout — groups, sizes, open tabs and the panel's position, saved per project — comes back, and a small window collapses it without losing it.
- Splitters are reached by keyboard and resized with the arrow keys, with the roles of tab lists and separators, and each split action has its "?" and its notice in English and Spanish.

Examples

- The one where the agent, asked "Que se pueda cancelar hasta 24 h antes del envío @REQ-031", plans to change changes/draft-pedidos/specs/pedidos/spec.md and run `specgate draft --check pedidos`.
- The one where sprich's node_modules shows dimmed under the root sprich.
- The one where the studio opens with no folder.
- The one where REQ-031 is open on the left and its REQ-031.feature on the right.

Questions

- Which icon set do we ship, under which licence?
- Through which specgate command does the agent run, and does it answer in JSON?
- What does Clone Repository run, and where does it clone?
- How many editor groups at most, and may they make a grid or only rows and columns?
