# Design: draft-flow-clarity

- **Core, Brief.draft** (REQ-241): after a module's run with errors, run the
  same `draft-module` command again, up to `FIX_PASSES = 2`; `DraftResult`
  gains `findings` for the module it stopped at. The UI's panel is a pure
  function (`apps/ui/src/draftSteps.ts`) over the brief's modules, the
  `command.event`s whose command drafts a module (the started module; a second
  start of the same module is a fix pass) and the final result.
- **Core, changes** (REQ-242): `ChangeCard.blockers` from `change show --json`'s
  `change.blockers` (`[]` when absent). `Changes.fix(change)` reads the agent
  from `config list`, and runs `draft-module` for the draft's module.
- **Core, changes** (REQ-243): `ChangeRequirement.next` from specgate status'
  category — `NEEDS_STATUS_UPDATE` → `apply`, `WAITING_FOR_ANSWER` → `answer`,
  `NEEDS_*` otherwise → `build`, DONE → null.
- **UI**: the card's running action is local state around `p.run`/`fix`, with a
  seconds counter. "Build" and "Answer" call `onOpenView`.
- AC-1, AC-2 → SCN-1018, SCN-1019; AC-3 → SCN-1020, SCN-1021; AC-4 → SCN-1022; AC-5 → SCN-1021, SCN-1023.
