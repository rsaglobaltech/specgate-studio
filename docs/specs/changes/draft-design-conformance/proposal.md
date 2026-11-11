# Proposal: draft-design-conformance

## Intent

The design-conformance module of the brief (`docs/briefs/design-conformance.md`):
what the approved IDE boards (`docs/design/IDE*.dc.html`) show and the studio
does not, outside the file tree (`draft-explorer-tree`) and outside what open
drafts already specify. The audit is `docs/design/conformance.md`, with the
screenshots of both sides in `docs/design/screens/`.

## Scope

In scope (REQ-171 … REQ-178):

- The boards' identity shipped with the studio: Syne, IBM Plex Sans and IBM
  Plex Mono, the colour tokens, 4 px corners, the orange block shadow; no font
  from the network (REQ-171).
- A frame without empty panels: the bottom panel and the tab strip only when
  they hold something; the menu bar, the gate pill in its colour and a primary
  Build in the header; a status bar of the open view (REQ-172).
- Home as `IDE-Inicio` draws it: the next step as a sentence, four counters,
  the route, the modules, the activity, the actions (REQ-173); an empty
  folder's Home as `IDE-Nuevo` draws it (REQ-174).
- Changes, Questions and Build as a side-panel list beside the selected item;
  Live in three columns (REQ-175).
- The "?" as a popover beside its button and the palette's explanation pane,
  under "[ UNDER THE HOOD ]"; the palette grouped by area (REQ-176).
- Editor tabs with the file's type and a requirement's id and title; a
  breadcrumb (REQ-177).
- The states of `IDE-Estados`: lost connection, loading, could not read,
  notices that stay on failure (REQ-178).

Out of scope: Traceability, Report and Settings (phase 3's drafts), the Brief
form (draft-brief), a draft's review in Changes (draft-changes), the file tree
(draft-explorer-tree), the agent panel of the shell board (Q1), the Help view
(Q3). Two bugs the audit found — Build listing a requirement a question
blocks, Report's count — are against REQ-101 and the report's own draft, and
are fixed there, not here.

## Approach

UI only, except the next step's sentence, which the core builds from
`specgate status` as it builds the next step today. The fonts are bundled as
WOFF2 files with the UI; the tokens stay in `apps/ui/src/styles.css`. One
side-panel component serves the explorer tree, Changes, Questions and Build.
The help popover reuses the catalog of draft-help: only where and how it opens
changes. Each requirement is proven by a browser test that names it, with a
screenshot compared to its board by eye in review; nothing goes through
`SpecgatePort` that does not today.
