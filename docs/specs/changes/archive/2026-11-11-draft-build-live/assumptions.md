# Assumptions — draft-build-live

| # | Assumption | Used in | Why | Status |
|---|---|---|---|---|
| A1 | The examples use sprich's draft-pedidos: REQ-030 ready, REQ-031 blocked by the open question Q2, REQ-032 queued after REQ-030 | REQ-101, REQ-103, REQ-105, SCN-301, SCN-305, SCN-306, SCN-309, SCN-310 | The requirements phase 1's examples used | confirmed |
| A2 | "Ready" means Approved, with its scenario, and no open question blocking it — the requirements `specgate status` lists to build | REQ-101 | The brief says "what is ready" without defining it | confirmed |
| A3 | The estimate shown is specgate's own per requirement (`specgate plan`'s cost hints), not one the studio computes | REQ-101 | specgate already estimates; the studio shows | confirmed |
| A4 | "Who codes" is the agent set as `agent` in harness.config.yaml (`claude` here); with none, Build names `specgate agents init --tool claude` | REQ-101, SCN-301, SCN-302 | specgate 0.33.0 sets the agent with adopt or agents init | confirmed |
| A5 | A build is `specgate harness run --req <REQ>`: the agent works on its own branch from the last commit and never pushes; the adoption baseline REQ-001 is built only when named | REQ-101 … REQ-105 | specgate's harness, as the help catalog explains Build | confirmed |
| A6 | "The specification" is spec.md, docs/specs/ and features/; any other uncommitted file makes Build wait | REQ-102 | The workspace module's grouping (draft-workspace A5) | confirmed |
| A7 | Commit runs `git commit` of the shown files with the person's message; stash runs `git stash --include-untracked`; ignore builds anyway and says the agent's branch leaves that work out. Each shows its files grouped by folder and runs only on confirmation | REQ-102, SCN-303, SCN-304 | The brief names the three choices, not what each does | confirmed |
| A8 | The commit message in the example is "Work in progress before building REQ-030", written by the Developer | SCN-303 | An example; the person writes their own | confirmed |
| A9 | Steps, output, queue, cost and tokens come from the harness's events (`.harness/events/`, `specgate harness events`), so a second tab or a reload sees the same | REQ-103, SCN-305, SCN-306 | The old studio's /live view reads the same events | confirmed |
| A10 | The agent's question in the example is "Round to the cent or to the nearest 5 cents?", answered "to the cent"; the answer goes through specgate (`specgate answer` on the harness's question) and is recorded where the agent reads it | REQ-104, SCN-307, SCN-308 | An example; specgate owns the question's file | confirmed |
| A11 | Stop now asks for confirmation; Stop after this requirement does not. Stopping ends the agent's process tree (its tests, servers, child shells) | REQ-105, SCN-309, SCN-310 | The brief: "stop now after a confirmation" | confirmed |
| A12 | The desktop app and the browser show the same Build and Live (the core host serves both) | REQ-101 … REQ-105 | ADR-0001; draft-core-host | confirmed |
