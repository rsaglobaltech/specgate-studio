# Design: remove-health-baseline

> Owner: architect — how the system meets the Discover. Name each acceptance
> criterion (AC-1, AC-2…) where it is answered.

## Modules

None. No code implements REQ-000; nothing in `packages/` or `apps/` changes.

## Mechanisms

- AC-1 — the delta lists REQ-000 under `## REMOVED Requirements`. On archive,
  `spec.md` loses the requirement (its row in section 8 and its prose),
  `docs/specs/traceability.md` loses its row, and `features/core/health.feature`
  is deleted — the three the starter's note names.
- AC-2 — `specgate check` after the archive.

## Channels

None.

## Decisions

Implementing a `/health` route on the host was rejected: the host answers
only the studio's own page with a session token (REQ-151), so an outside probe
could not reach it anyway, and the main page's availability is already
REQ-035 SCN-100.
