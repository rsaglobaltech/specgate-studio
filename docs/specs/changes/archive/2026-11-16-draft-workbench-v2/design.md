# Design: draft-workbench-v2

> Owner: architect — written by `specgate migrate 1.0` from the proposal. Review it.

## Modules

<!-- Which modules or services change, and what each one owns. -->

## Mechanisms

The agent panel is a view of the host: the request goes to the project's agent through specgate (A5, Q2 — the command specgate lacks is named), the plan comes back as data, and nothing is written before the Developer confirms its diff; writes go through the host's file port as the tree's do. The bottom panel is the workbench's panel, never hidden. The Explorer reads the root's entries with ignored ones marked, and maps names to the icon theme's SVGs shipped with the UI (Q1).

This change modifies requirements of draft-design-conformance and draft-explorer-tree (PR #22): it is reviewed after them, and its branch starts from theirs.

## Channels

<!-- APIs, events, queues. -->

## Decisions

