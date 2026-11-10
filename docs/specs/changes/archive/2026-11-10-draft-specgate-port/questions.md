# Questions — draft-specgate-port

| # | Question | Blocks | Options seen | Answer | Status |
|---|---|---|---|---|---|
| Q1 | Which specgate commands lack a `--json` output today? | REQ-012 | Measured on 0.30.0: `status`, `change list`, `change show`, `change validate`, `config list`, `questions`, `matrix`, `report`, `doctor`, `plan`, `apply`, `answer`, `archive`, `propose` all print JSON with `--json` | None that the studio reads: on 0.30.0 status, change list, change show, change validate, config list, questions, matrix, report, doctor, plan, apply, answer, archive and propose all print JSON with --json (measured on specgate-studio) | reviewed |
| Q2 | Which specgate release publishes the in-process API, and with which commands first? | REQ-014 | A change in the specgate repo exporting `@rsaglobaltech/specgate/api` with `status`, `questions`, `matrix` first (the sections read most) | A specgate change exports @rsaglobaltech/specgate/api with status, questions and matrix first; REQ-014 is built against the specgate release that ships it, the CLI adapter covering every other command until then | reviewed |
