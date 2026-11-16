# Design: draft-report

> Owner: architect — written by `specgate migrate 1.0` from the proposal. Review it.

## Modules

<!-- Which modules or services change, and what each one owns. -->

## Mechanisms

The core host reads `specgate report --format json`, `specgate harness report
--json` and the last gate specgate records through `SpecgatePort`. REQ-131 and
REQ-132 are built against specgate 0.35.0, expected to add a module filter, the
module in `status`, per-scenario rows, measured cost, `stages[]` on every check
answer and a last-gate result (A4, A7, A8). The project's line coverage is not
on that list: it shows as not measured until specgate gives it (A13). The
downloaded page is rendered by the studio from the same data, with no script.

## Channels

<!-- APIs, events, queues. -->

## Decisions

