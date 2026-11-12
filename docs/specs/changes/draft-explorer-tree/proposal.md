# Proposal: draft-explorer-tree

## Intent

The explorer-tree module of the brief (`docs/briefs/design-conformance.md`):
the project's files as a tree in the side panel, as the approved shell board
(`docs/design/IDE.dc.html`) draws it. Today Explorer is a flat list of full
paths in the main area, cut off in the side list, with no folders, icons, git
state, keyboard or menu (`docs/design/conformance.md`, "Explorer and editor";
`docs/design/screens/studio/explorer.png` against
`docs/design/screens/design/shell.png`).

## Scope

In scope (REQ-161 … REQ-168):

- Folders opened one level at a time, reading only that folder, under 50 ms in
  a project of 50,000 files; the folders left open kept per project (REQ-161).
- The side panel's look, file-type icons and the specification marked (REQ-162).
- Git letters M, U, A and a dot on folders holding a change (REQ-163).
- The active editor's file revealed (REQ-164).
- Arrows, Enter, F2 and Delete (REQ-165).
- A context menu — new file, new folder, rename, delete with a confirmation,
  copy path, open in terminal — whose writes go only through the host's file
  port, from the studio's own page, inside the project (REQ-166).
- Today's filter, filtering inside the tree; ignored files never shown (REQ-167).
- The "?" and the notices, in English and Spanish (REQ-168).

Out of scope: drag and drop, multi-select, copy and paste of files, compare,
"open with", a second root; the spec sections of the board's side panel
until Q3 is answered; every other gap of the audit, which is
`draft-design-conformance`.

## Approach

The core gains the tree's model (open folders, selection, the order, the git
letter of a path, the reveal of a path) as plain functions, tested without a
browser. The host gains one request per folder's children and one per write
(A2, A13), over the `ProjectFiles` port that the Node adapter implements; each
write is checked for its path, links resolved, before the port is called. The
UI draws the tree with the workbench's virtualised list (REQ-036), in the side
panel with the boards' tokens. Nothing goes through `SpecgatePort`.
