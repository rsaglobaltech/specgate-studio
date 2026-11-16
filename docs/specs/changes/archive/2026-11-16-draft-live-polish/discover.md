# Proposal: draft-live-polish

## Intent

The person who owns the studio watched it build REQ-141 live and found it hard to use (`docs/briefs/live-polish.md`): Live listed raw shell commands as its steps and stayed empty for the first seconds, the module map ran over the content, the side panel scrolled sideways, Build's list hid each title behind its estimate, the agent panel could not be reopened once closed, REQ-000 was offered as work to build, Build said "No hay agente" after the agent was set, and the commit dialog hid its message field. Live becomes the "IDE · En vivo" board (`docs/design/IDE-EnVivo.dc.html`), and the rest is corrected as agreed.

## Scope

MODIFIED:

- REQ-101 (build-live): each title with its estimate below it, no horizontal scroll, REQ-000 only when named.
- REQ-102 (build-live): the commit's message field labelled, and Confirm saying why it is disabled.
- REQ-103 (build-live): Live as the board — the harness's stages with ✓ ● ○ ✗ and their times, never an empty step list; the header's counts, elapsed time, tokens and cost; the modules and the queue with estimates; NECESITA ATENCIÓN and TERMINADOS with time and cost.
- REQ-105 (build-live): "Parar tras este requisito" and "Parar ya…" in Live's header.

ADDED (REQ-201 … REQ-204):

- REQ-201: SALIDA DEL AGENTE as one timestamped line per action, following the end and pausing when scrolled up. Waits on Q1 for its counts.
- REQ-202: no overlap, no dead column and no sideways scroll in any view at 1440×900 and 1280×800, audited by a test.
- REQ-203: "Configurar agente" runs `specgate agents init --tool claude` after a confirmation, and Build follows `harness.config.yaml` without a reload.
- REQ-204: the agent panel reopened from the activity bar, "Agente" in the status bar, Ctrl/Cmd+Alt+B and the palette. It adds to draft-workbench-v2's REQ-190 instead of modifying it: REQ-190 is Implemented in a change not archived yet, and its new scenarios would fail the gate as unproven (A17).

Unchanged: REQ-104 (the agent's question answered in Live — in the right column, as A1 places it).

Out of scope: several builds at once, editing the queue from Live, and any board but En vivo, Construir and Banco de trabajo.

## Approach

Live reads specgate 0.34.0's `HarnessStreamEvent` stream (`specgate harness run --format jsonl`, or `.harness/events/` for a run the studio did not start) and folds it, in the core, into a board model — stages, counts, queue, log lines, finished — that the view only draws (A3, A6). Nothing in the UI parses the agent's text. specgate writes no event for the branch, so "Rama creada" is inferred from the requirement's first event (A3); the counts a log line lacks wait on specgate (Q1, A7). Build's agent comes from a watch on `harness.config.yaml` through the host (A14). The layout audit is a Playwright test over every view at both sizes (A16).

REQ-204 builds on draft-workbench-v2's REQ-190: this change is reviewed after it.
