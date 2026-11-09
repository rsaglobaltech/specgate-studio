# Proposal: draft-core-host

## Intent

The core-host module of the brief (`docs/brief.md`), written down as requirements and
scenarios a person can review before anything is built: the long-lived process
that holds an open project's state in memory, refreshes only what a changed
file feeds, answers a section in under 50 ms, streams every command as events,
runs one write at a time and never runs a shell.

## Scope

In scope: what the brief says about core-host (REQ-001 … REQ-007).

Out of scope: every other module of the brief. How specgate is called is
specgate-port; the file watcher itself is workspace; what the UI draws is
workbench.

## Approach

`packages/host` wires the use cases of `packages/core` to their adapters and
serves them over JSON-RPC (ADR-0001). The state is a cache keyed by the files
each section reads (A4); a watcher event invalidates only the keys of that
file. Commands go through `SpecgatePort` (ADR-0003) as argument arrays; one
write lock per project.
