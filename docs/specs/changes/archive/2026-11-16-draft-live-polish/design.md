# Design: draft-live-polish

> Owner: architect — written by `specgate migrate 1.0` from the proposal. Review it.

## Modules

<!-- Which modules or services change, and what each one owns. -->

## Mechanisms

Live reads specgate 0.34.0's `HarnessStreamEvent` stream (`specgate harness run --format jsonl`, or `.harness/events/` for a run the studio did not start) and folds it, in the core, into a board model — stages, counts, queue, log lines, finished — that the view only draws (A3, A6). Nothing in the UI parses the agent's text. specgate writes no event for the branch, so "Rama creada" is inferred from the requirement's first event (A3); the counts a log line lacks wait on specgate (Q1, A7). Build's agent comes from a watch on `harness.config.yaml` through the host (A14). The layout audit is a Playwright test over every view at both sizes (A16).

REQ-204 builds on draft-workbench-v2's REQ-190: this change is reviewed after it.

## Channels

<!-- APIs, events, queues. -->

## Decisions

