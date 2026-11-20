# Design: draft-desktop

> Owner: architect — written by `specgate migrate 1.0` from the proposal. Review it.

## Modules

<!-- Which modules or services change, and what each one owns. -->

## Mechanisms

`apps/desktop` holds the Tauri 2 shell and the Rust pty (ADR-0002); it wires the
host as a Node single-executable sidecar and adds no business rule (ADR-0001).
A release workflow builds and signs on macOS, Windows and Linux runners; the
signing secrets will live there. Rust is needed to build the desktop app, not to
work on the core or the UI. While the owner arranges the signing accounts, the
macOS and Windows installers ship unsigned; the signing step runs as soon as its
secrets exist, with no other change to the pipeline (A15).

## Channels

<!-- APIs, events, queues. -->

## Decisions

