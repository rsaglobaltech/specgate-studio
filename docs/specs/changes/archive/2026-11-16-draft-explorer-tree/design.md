# Design: draft-explorer-tree

> Owner: architect — written by `specgate migrate 1.0` from the proposal. Review it.

## Modules

<!-- Which modules or services change, and what each one owns. -->

## Mechanisms

The core gains the tree's model (open folders, selection, the order, the git
letter of a path, the reveal of a path) as plain functions, tested without a
browser. The host gains one request per folder's children and one per write
(A2, A13), over the `ProjectFiles` port that the Node adapter implements; each
write is checked for its path, links resolved, before the port is called. The
UI draws the tree with the workbench's virtualised list (REQ-036), in the side
panel with the boards' tokens. Nothing goes through `SpecgatePort`.

## Channels

<!-- APIs, events, queues. -->

## Decisions

