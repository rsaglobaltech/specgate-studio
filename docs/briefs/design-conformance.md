---
product: Specgate Studio — the approved IDE design
surfaces: [desktop, web]
actors:
  - { name: Developer, surfaces: [desktop, web] }
  - { name: Reviewer, surfaces: [desktop, web] }
modules: [explorer-tree, design-conformance]
---

# Specgate Studio — looking and working like the approved IDE design

The owner approved an IDE design for the studio in a canvas ("Specgate Studio
— rediseño"); its boards are in `docs/design/` (`IDE.dc.html` is the shell,
`IDE-*.dc.html` the views). The audit in `docs/design/conformance.md` compares
each view with its board. This brief closes the gaps that no open draft
covers: the file tree first, then the rest of what the boards show. Views that
phase 3's drafts already specify (traceability, report, settings, desktop)
and the content of draft-brief and draft-changes are not repeated here.

## Module: explorer-tree

The project's files as a tree in the side panel, as the shell board draws it.

Rules

- Folders open and close one level at a time and only the opened folder is read, so that in a project of 50,000 files a folder's children show in under 50 ms; the folders left open are kept per project.
- Each row, in the side panel the boards draw (a 36 px uppercase header with its "?", the orange inset on the current row), shows its file type's icon, and spec.md, docs/specs and features are marked as the specification.
- Each file changed in git shows its letter in its colour (M modified, U untracked, A added), and a folder holding a change shows a dot.
- When a file becomes the active editor tab, the tree opens the folders above it and selects it.
- When the tree has the focus, the arrow keys move and open or close folders, Enter opens, F2 renames and Delete deletes.
- A context menu offers new file, new folder, rename, delete after a confirmation, copy path and open in terminal; each write goes through the host's file port, only from the studio's own page and never outside the project, and has its "?" and its notice in English and Spanish.
- The filter shows the matching files inside their folders, and what .gitignore and the studio's ignore rules name is never shown.

Examples

- The one where the Developer opens `packages/core` in sprich and its children show at once, without the rest of the 50,000 files being read.
- The one where `docs/brief.md` shows M in amber and the folder `docs` a dot.
- The one where F2 on `docs/notes.md` renames it to `docs/notes-old.md`.

Questions

- How tall is a row: 26 px as the shell board's explorer, or 30 px as the Changes board's list?
- Does Delete move the file to the trash or remove it for good?
- Does the side panel show only the file tree, or the shell board's spec sections and its modules and requirements above it?

## Module: design-conformance

The rest of what the boards show and the studio does not.

Rules

- The studio ships its own fonts (Syne for titles, IBM Plex Sans for text, IBM Plex Mono for code) and draws with the boards' colours, 4 px corners and the orange block shadow, with no network.
- Unless they hold something, the bottom panel and the tab strip are hidden; the header carries the menu bar, the gate pill in the gate's colour and a primary Build, and the status bar shows what the open view counts.
- Home leads with the next step as a sentence with its reason, its button and its "?", then four counters, the route, the modules and the activity, and a row of common actions; in an empty folder Home asks the five questions as option cards beside "Already have code?" and the recent projects.
- Changes, Questions and Build list their items in a side panel, grouped as their boards group them, and show the selected one beside it; Live shows the modules and the queue, the current requirement, and what needs attention, in three columns.
- The "?" opens beside the button that has it, and the palette shows the selected feature's explanation beside its list, both under "[ UNDER THE HOOD ]"; the palette groups the features by area.
- Editor tabs show the file's type and, for a requirement, its id and title, and a breadcrumb shows where the open file is.
- When the connection to the host is lost, a banner and a grey status bar say so until it is back; a section being read shows its shape, a section that cannot be read names the file and line and offers to read it again, and a failed action's notice stays until it is closed and offers to retry.

Examples

- The one where Home in sprich says "Answer 2 questions of the draft pedidos", with "Answer now".
- The one where the host stops and the banner says "Reconnecting to the studio…".
- The one where the Reviewer presses the "?" beside "Ask for a change" and it opens under it with `specgate change note`.

Questions

- Is the agent panel of the shell board part of this change, a draft of its own, or left out?
- Is the menu bar the operating system's menu on the desktop app, a bar in the page on both, or left to the palette?
- What does the Help view show, since no board draws it?
