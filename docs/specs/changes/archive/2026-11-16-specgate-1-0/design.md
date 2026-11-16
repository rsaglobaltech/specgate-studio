# Design: specgate-1-0

> Owner: architect — written by `specgate migrate 1.0` from the proposal. Review it.

## Modules

<!-- Which modules or services change, and what each one owns. -->

## Mechanisms

The core reads specgate 1.0's JSON and falls back to the 0.x fields, so an older specgate keeps working: `approvalsOf` reads `change.approvals` only when `required` is true, `nextCommandOf` prefers `next.command` to `nextCommand`, and `codedError` splits a result's error into code, message and fix for the build's notice.

## Channels

<!-- APIs, events, queues. -->

## Decisions

