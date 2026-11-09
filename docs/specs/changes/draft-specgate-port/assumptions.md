# Assumptions — draft-specgate-port

| # | Assumption | Used in | Why | Status |
|---|---|---|---|---|
| A1 | The installed version is read with `specgate --version`; the update command shown is `npm i -g @rsaglobaltech/specgate@<needed>` | REQ-013 | What specgate's own docs tell people to run | to confirm |
| A2 | The message reads "specgate <installed> is installed; the studio needs <needed>" — with 0.29.1 and 0.30.0: "specgate 0.29.1 is installed; the studio needs 0.30.0" | REQ-013, SCN-035 | Says both versions, as the brief asks | to confirm |
| A3 | A command the port does not offer is refused with the code `command_unknown` | REQ-016 | A stable code like `write_busy` (draft-core-host A3) | to confirm |
| A4 | The sections are read with `status`, `change list`, `questions`, `matrix` and `report`, each with `--json`; apply with `apply <REQ> --json` | REQ-012, REQ-014 | Measured on specgate 0.30.0: each prints JSON on stdout | to confirm |
| A5 | The contract tests live in `packages/core/test/contracts/` and one is named `questions lists what each question blocks` | REQ-015 | ADR-0001: one contract suite per port | to confirm |
| A6 | The in-process API, when it exists, is imported from `@rsaglobaltech/specgate/api` | REQ-014 | ADR-0003 | to confirm |
| A7 | None that the studio reads: on 0.30.0 status, change list, change show, change validate, config list, questions, matrix, report, doctor, plan, apply, answer, archive and propose all print JSON with --json (measured on specgate-studio) | REQ-012 | Q1 | decided |
