# Proposal: demo-findings

## Intent

Watching the studio build REQ-141 live showed four small faults. The person runs Claude Code on a Max subscription, yet the studio said "Coste" for a figure that is only what the work would cost at API prices. REQ-142 and REQ-143, left by that run with their tests in place (`NEEDS_STATUS_UPDATE`), vanished from Build with no way to close them. The queued build's terminal line named the last button pressed ("Construir REQ-143" over the run of REQ-142). And "Rama creada · 33 s" counted the wait until the first event as the branch's time.

## Scope

MODIFIED:

- REQ-101 (build-live, as draft-live-polish left it): "Listos para cerrar" with "Aplicar" (`specgate apply <REQ>`) for every `NEEDS_STATUS_UPDATE` requirement.
- REQ-103 (build-live, as draft-live-polish left it): the header and TERMINADOS show usage as REQ-211 labels it; "Rama creada" shows specgate's own time for it or "—"; each queued run is echoed with its own button.

ADDED:

- REQ-211: usage — tokens, turns, and the dollar figure "≈ precio de API" — in the status bar, Home, Live's header and TERMINADOS; "Coste" only once the Developer sets that they pay per use.

Out of scope: specgate itself (its events carry no billing and no branch time; see A1, A3), and the estimate's `cost_per_run_hint`, which is the project's declared unit, not what Claude Code reports.

## Approach

The core folds the turns with the tokens from the final `usage` event, and Home's usage from `harness report --json`'s `costByProfile` tokens and its measured or estimated total. Build's list gains `toClose` from `status --json`. "Rama creada" takes its time only from a specgate event that gives one. The UI keeps the billing choice with the language and theme, and maps each queued build's button to its requirement so the echo of `harness run --req <REQ>` names its own.
