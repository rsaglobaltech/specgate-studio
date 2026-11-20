# Design: req-101-title

> Owner: architect — how the system meets the Discover. Name each acceptance
> criterion (AC-1, AC-2…) where it is answered.

## Modules

None: only REQ-101's title changes. Its body, scenarios and tests are unchanged.

## Mechanisms

- AC-1 — "REQ-000 only when named" becomes "the adoption baseline only when named"; the body still names REQ-000, which specgate does not read as an id.
- AC-2 — `specgate validate --strict` after the archive.

## Channels

None.

## Decisions

specgate takes every `REQ-NNN` in a requirement's heading as a requirement id. Reported upstream as a specgate issue; this change does not wait for it.
