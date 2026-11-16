# Design: draft-traceability

> Owner: architect — written by `specgate migrate 1.0` from the proposal. Review it.

## Modules

<!-- Which modules or services change, and what each one owns. -->

## Mechanisms

The core host reads the rows from specgate through `SpecgatePort` and keeps them
in memory (REQ-002); a saved test or feature refreshes only the matrix (REQ-003).
specgate 0.33.2 gives only a row count in `matrix --json`: the per-scenario
`rows[]` are asked of specgate in both the CLI and the API, expected in specgate
0.35.0, and REQ-121 and REQ-122 are built against them — no interim
per-requirement view (A5, A12, Q2). "Fix" goes through the help catalog:
a "?" and its notices in English and Spanish (draft-help).

## Channels

<!-- APIs, events, queues. -->

## Decisions

