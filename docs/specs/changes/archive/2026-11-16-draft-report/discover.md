# Proposal: draft-report

## Intent

Phase 3 of the studio: the report for the client. The workbench already has a
Report view with nothing behind it, and the status bar shows the gate, the
progress and the cost. The Reviewer needs one page that says how far the
project is, how well it is proven and what it cost, and that can be sent.

## Scope

In scope (docs/briefs/phase-3-proof-and-desktop.md, module report):

- Built of the total, scenarios proven, coverage, mutation score, cost and time,
  for the project and per module (REQ-131): coverage as the harness's diff
  coverage and the project's line coverage, labelled (Q1); cost measured from
  tokens when it exists, else the estimate per profile (Q2).
- The last gate specgate recorded, by stage, with the fix of what fails (REQ-132).
- Download as one HTML page; print to PDF (REQ-133).

Out of scope:

- Running the quality checks or the gate from Report beyond the existing Check.
- Sending the report (email, ALM); it is downloaded or printed.

## Approach

The core host reads `specgate report --format json`, `specgate harness report
--json` and the last gate specgate records through `SpecgatePort`. REQ-131 and
REQ-132 are built against specgate 0.35.0, expected to add a module filter, the
module in `status`, per-scenario rows, measured cost, `stages[]` on every check
answer and a last-gate result (A4, A7, A8). The project's line coverage is not
on that list: it shows as not measured until specgate gives it (A13). The
downloaded page is rendered by the studio from the same data, with no script.
