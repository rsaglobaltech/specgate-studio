# Discover: draft-flow-clarity

## Context

Drafting a real client's brief: "Draft the modules" stopped at the first
module whose draft had findings, and only the terminal said so. Changes then
listed that draft with an Approve that specgate refused, and later offered
Apply for a requirement that had no test yet. The Developer had to read the
terminal to know what was running and what to do next.

## Use case

1. The Developer presses "Draft the modules": the Brief view shows each module,
   which one runs and for how long, and fixes a draft with findings on its own.
2. In Changes, a draft that cannot be approved says why and offers the agent's fix.
3. Each requirement offers its next step: Build, Answer or Apply.
4. Whatever runs shows on its card with its time.

## Acceptance criteria

- AC-1: a draft with findings gets up to two fix passes before drafting stops.
- AC-2: the Brief view shows every module's state while drafting.
- AC-3: a change that cannot be approved shows its blockers, no working Approve, and a fix.
- AC-4: Apply only for a requirement whose test and code are there; Build or Answer otherwise.
- AC-5: an action under way shows on its card.
