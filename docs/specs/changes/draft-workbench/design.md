# Design: draft-workbench

> Owner: architect — written by `specgate migrate 1.0` from the proposal. Review it.

## Modules

<!-- Which modules or services change, and what each one owns. -->

## Mechanisms

`apps/ui` in Preact, one bundle for the desktop webview and the browser
(ADR-0002), importing only `@specgate-studio/protocol` and talking to the core
host over JSON-RPC on a WebSocket (ADR-0001, draft-core-host). The frame is a
shell component with the activity bar, the tabs, the panel and the status
bar; each view is loaded on first open. The palette is built from one registry
of features, each with its titles in both languages and its specgate
command, so the palette, the "?" and the tests read the same list. Lists are
virtualised (A14); the budgets are measured in CI (A12).

## Channels

<!-- APIs, events, queues. -->

## Decisions

