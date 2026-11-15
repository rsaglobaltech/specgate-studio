# Proposal: specgate-1-0

## Intent

specgate 1.0 approves a change layer by layer — discover (product), design (architect), tasks (developer) — and its harness skips a requirement whose change still waits for one, with `harness_not_approved`. The studio read only the `approved:` line of `change.yaml`, which outlives an edit of a layer approved before it: Changes said "approved" and Build offered a requirement the harness then skipped with a bare "skipped". specgate 1.0 also names its next step under `next` and asks, under `migrate`, for `specgate migrate 1.0` while open changes are written for 0.x; the studio showed neither.

## Scope

In scope:

- REQ-214: a change's approval from `change show --json`'s `change.approvals` when specgate waits for it, each written layer shown in Changes with its owner and its state; Build waits for it.
- REQ-215: Home's next step from `status --json`'s `next.command`, and `specgate migrate 1.0` first while `migrate` asks for it.
- REQ-216: a build specgate refused with a coded error (`harness_not_approved: … Fix: …`) ends with that code, its message and its fix.
- The studio's own specgate: `@rsaglobaltech/specgate` ^1.0.0-rc.12, and pre-release versions compared as semver orders them (REQ-013).
- What specgate 1.0 writes that the studio already listed: adoption's preview names `docs/specs/glossary.md` too (REQ-112).

Out of scope:

- Approving a layer from the studio (`change approve --layer`) and opening the repositories of a workspace: their own changes.
- Migrating this repository's own open changes to 1.0.

## Approach

The core reads specgate 1.0's JSON and falls back to the 0.x fields, so an older specgate keeps working: `approvalsOf` reads `change.approvals` only when `required` is true, `nextCommandOf` prefers `next.command` to `nextCommand`, and `codedError` splits a result's error into code, message and fix for the build's notice.
