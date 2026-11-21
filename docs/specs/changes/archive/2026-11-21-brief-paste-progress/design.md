# Design: brief-paste-progress

- UI only: `BriefForm`'s paste dialog. The textarea is `readOnly` while
  `busy`; the scrim and Escape do nothing while `busy` (the scrim already
  ignores clicks).
- The steps are a small pure function in `apps/ui/src/views/pasteSteps.ts`
  (`pasteSteps(state, agent, seconds, command, failure)`): no business rule,
  only what to show for each state, so it is unit-tested without a browser.
- The command: the UI listens to `command.event` `started` for the run whose
  command contains `propose --from-brief`, as the terminal does. The seconds:
  a one-second interval while busy.
- The refusal: `brief.propose` already answers `{ ok: false, message,
  notice }`; the core adds specgate's error findings (`code`, `message`,
  `fix`) to that answer so the dialog can show them (`BriefFormResult`
  failure gains `findings?`).
- AC-1 → SCN-1014; AC-2 → SCN-1014; AC-3 → SCN-1015.
