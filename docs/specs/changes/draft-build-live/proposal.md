# Proposal: draft-build-live

## Intent

Phase 2 of the studio: from an approved requirement to a built one without
leaving the studio. Today the editor's Build lens only opens a placeholder,
and a build that refuses to start says "Uncommitted files that are not the
specification" with no way out (seen on sprich, 325 files).

## Scope

In scope (docs/briefs/phase-2-specgate-flow.md, module build-live):

- Build: what is ready, its estimate, who codes (REQ-101).
- Uncommitted work: why Build waits, and commit, stash or ignore, each
  confirmed (REQ-102).
- Live: steps with their time, the agent's output as it streams, the queue,
  cost and tokens (REQ-103); the agent's question answered there (REQ-104).
- Stopping after this requirement, or now after a confirmation, ending every
  process the agent started (REQ-105).

Out of scope:

- Choosing or configuring agents and profiles (project-setup, settings).
- The report of a finished build (phase 3).

## Approach

The studio runs specgate's harness (`specgate harness run --req <REQ>`) through
the core host and reads its events; every action shows its command (help) and
is echoed in the studio's terminal. The brief asks no question for this module.
