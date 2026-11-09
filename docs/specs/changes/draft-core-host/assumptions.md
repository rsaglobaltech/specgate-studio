# Assumptions — draft-core-host

What the brief does not say, chosen so the scenarios can be tested. Each is to
confirm by the person reviewing the draft.

| # | Assumption | Used in | Why | Status |
|---|---|---|---|---|
| A1 | The JSON-RPC methods are `project.open` and `section.get`; sections are named `home`, `changes`, `questions`, `matrix`, `report` | REQ-001, REQ-003, REQ-004 | Names a test can call; the full protocol is written in packages/protocol | to confirm |
| A2 | The web host answers on `http://127.0.0.1:4180` | REQ-001 | Loopback only (runtime-environments.md); 4180 is free next to the old studio's 4173 | to confirm |
| A3 | A refused write answers with the code `write_busy` | REQ-006 | A stable code the UI can translate, like specgate's own codes | to confirm |
| A4 | `questions.md` feeds Questions and the matrix; a `.feature` file feeds the matrix only | REQ-003 | The files each section reads in specgate today | to confirm |
| A5 | Exit code 0 is success and 1 a refusal, as specgate returns them | REQ-005 | specgate's own exit codes | to confirm |
| A6 | The example project is sprich at `~/mvp/sprich-platform/sprich`, and `C:\Users\Juan Perez\shop` on Windows | REQ-001 … REQ-007 | A real project measured at 1.9 s; a path with a space, as specgate's REQ-431 | to confirm |
| A7 | WebSocket on 127.0.0.1 for both: the desktop sidecar listens like the web host, one transport | REQ-001 | Q1 | decided |
