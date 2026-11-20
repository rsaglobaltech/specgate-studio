# Delta — core

## REMOVED Requirements

### Requirement: REQ-000 — The service reports its own health

**Reason**: the starter requirement `specgate init` writes for a deployed
service. Specgate Studio is a desktop app and a local `serve` host, not a
deployed service: no deployment probes it, and the host already refuses every
request without the session token (REQ-151). Its scenario, SCN-000, describes
the main page loading, which REQ-035 SCN-100 already covers.

**Migration**: none. `features/core/health.feature` and the REQ-000 row of
`docs/specs/traceability.md` go with it, as the starter's own note asks.
