# Proposal: draft-specgate-port

## Intent

The specgate-port module of the brief (`docs/brief.md`): how the studio uses
specgate. The core sees one interface, `SpecgatePort`; a CLI adapter runs
specgate with `--json` and returns typed data and findings; a second adapter
will call specgate in process once specgate publishes an API; both pass one
contract suite; the installed version is checked at start; a command the port
does not offer never runs.

## Scope

In scope: REQ-011 … REQ-016.

Out of scope: the host and its cache (core-host); the specgate change that
publishes the in-process API (in the specgate repository, Q2).

## Approach

`SectionReader` and `ProcessRunner` of core-host become part of
`SpecgatePort`. `packages/adapter-specgate-cli` implements it with the
`NodeProcessRunner` and `--json`; its answers are recorded as fixtures that
load the in-memory fake, so the contract suite runs fast and the same against
every adapter (ADR-0003).
