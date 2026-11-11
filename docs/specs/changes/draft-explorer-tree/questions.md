# Questions — draft-explorer-tree

What only the person who owns the studio can decide. All three come from the
brief (`docs/briefs/design-conformance.md`); the boards disagree on Q1 and are
silent on Q2 and Q3.

| # | Question | Blocks | Options seen | Answer | Status |
|---|---|---|---|---|---|
| Q1 | How tall is a row: 26 px as the shell board's explorer, or 30 px as the Changes board's list? | REQ-162 | 26 px, as `IDE.dc.html`'s explorer (denser, closest to VS Code's 22 px) · 30 px, as `IDE-Cambios.dc.html`'s list, the same in every side panel · 26 px in the tree and 30 px in the views' lists |  | open |
| Q2 | Does Delete move the file to the trash or remove it for good? | REQ-166 | To the system's trash, after a confirmation (VS Code's default; can be undone outside the studio) · Removed for good, after a confirmation that says so · To the trash, and Shift+Delete removes for good after its own confirmation |  | open |
| Q3 | Does the side panel show only the file tree, or the shell board's spec sections and its modules and requirements above it? | REQ-162 | Only the file tree, as VS Code; the spec stays in its views · The board's "EXPLORADOR DE LA SPEC" (spec.md, brief, open changes, capabilities, features) and "MÓDULOS · REQUISITOS" with status dots, and the file tree below them as a third, collapsible section · The board's two sections only, the file tree in the full Explorer view |  | open |
