# Proposal: draft-report

## Intent

Phase 3 of the studio: the report for the client. The workbench already has a
Report view with nothing behind it, and the status bar shows the gate, the
progress and the cost. The Reviewer needs one page that says how far the
project is, how well it is proven and what it cost, and that can be sent.

## Scope

In scope (docs/briefs/phase-3-proof-and-desktop.md, module report):

- Built of the total, scenarios proven, coverage, mutation score, cost and time,
  for the project and per module (REQ-131) — waiting for Q1 and Q2.
- The gate by stage, with the fix of what fails (REQ-132).
- Download as one HTML page; print to PDF (REQ-133).

Out of scope:

- Running the quality checks or the gate from Report beyond the existing Check.
- Sending the report (email, ALM); it is downloaded or printed.

## Approach

The core host reads `specgate report --format json`, `specgate harness report
--json` and the last `specgate check --json` through `SpecgatePort`. Three things
specgate 0.33.2 does not give in JSON are asked of specgate first: a filter by
module, scenario rows, and the gate's stages when it fails (A4, A7, A8). The
downloaded page is rendered by the studio from the same data, with no script.
