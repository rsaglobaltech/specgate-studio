# Design: draft-brief

> Owner: architect — written by `specgate migrate 1.0` from the proposal. Review it.

## Modules

<!-- Which modules or services change, and what each one owns. -->

## Mechanisms

The Brief view replaces the workbench's placeholder. The form and Monaco edit
the same `docs/brief.md` through the host's file save (draft-editor REQ-045),
the form owning only its fields (A2). Every save runs specgate's brief check
and its findings reach Problems and the editor's underlines (A3). Drafting and
proposing run specgate with the project's agent through the host's commands —
argument arrays, one write at a time — echoed in the terminal with their button
and explained by help's catalog (A6, A9, A11).

## Channels

<!-- APIs, events, queues. -->

## Decisions

