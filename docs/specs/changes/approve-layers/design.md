# Design: approve-layers

> Owner: architect — written by `specgate migrate 1.0` from the proposal. Review it.

## Modules

<!-- Which modules or services change, and what each one owns. -->

## Mechanisms

A new command `change-approve` with the change and one of the three layers, validated like every command from the wire; `Commands` reads `approve.ok` from the answer to name `approvals.json`; a help entry `approve` in English and Spanish; the button in Changes' layer list.

## Channels

<!-- APIs, events, queues. -->

## Decisions

