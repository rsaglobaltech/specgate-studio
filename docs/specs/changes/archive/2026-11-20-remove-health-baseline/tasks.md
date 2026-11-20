# Tasks

> Owner: developer — each task is verifiable and names the requirement it
> delivers (REQ-NNN).

## 1. Specification

- [x] 1.1 Write the delta spec: REQ-000 under REMOVED Requirements
- [x] 1.2 Run `specgate change validate`

## 2. Archive (on review)

- [x] 2.1 REQ-000 — `specgate archive remove-health-baseline` drops its row from
      `docs/specs/traceability.md`. REQ-000 lives in the root `spec.md`, not in a
      capability, so the archive does not reach it: in the same commit, remove
      its row from section 8 and its `### REQ-000` block from `spec.md`, and
      delete `features/core/health.feature` (the starter's note: "remove all
      three together").
