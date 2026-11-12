# Delta — live-polish

## ADDED Requirements

### Requirement: REQ-201 — SALIDA DEL AGENTE: one timestamped line per action, following the end

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL show in Live's SALIDA DEL AGENTE, while the agent works, one line per action of the agent — its time, then `read <file>`, `edit <file>`, `run <command>` with ✓ or ✗, or `ask <question>`; the lines an edit added (`+N`) and the tests a run passed or failed (`✓ N passing`, `✗ N failing`) shown as soon as specgate's events give them, and left out, never guessed from the agent's text, while they do not (specgate 0.34.0) — each line one row however long its command, the full command shown on hover and when the line is expanded; and SHALL keep the end in view as lines arrive unless the Developer scrolls up, then pause, saying "sigue el final · sube para pausar", until the Developer returns to the end.

> Brief: "While the agent works, SALIDA DEL AGENTE shows one timestamped line per action — read, edit with the lines added, run with the tests passing or failing, ask — with the full command on hover or when expanded, and follows the end unless the Developer scrolls up ("sigue el final · sube para pausar")."

#### Scenario: SCN-601 — The agent's actions on REQ-012, on the desktop

- GIVEN the desktop app building REQ-012, Live open, specgate's events giving the lines each edit added and the tests each run passed or failed
- WHEN the agent reads `features/auth/REQ-012.feature`, edits `packages/core/test/auth/SignOut.test.ts` adding 42 lines, runs `pnpm test SignOut` with 1 failing, then runs it again with 3 passing
- THEN the Developer sees four lines under SALIDA DEL AGENTE, each with its time: `read features/auth/REQ-012.feature`, `edit packages/core/test/auth/SignOut.test.ts +42`, `run pnpm test SignOut ✗ 1 failing`, `run pnpm test SignOut ✓ 3 passing`, and no raw shell command on its own row

#### Scenario: SCN-616 — specgate 0.34.0 counts the lines, not the tests, on the desktop

- GIVEN the desktop app building REQ-141 with specgate 0.34.0, whose events give the lines an edit added but no test counts
- WHEN the agent edits `packages/core/src/domain/help.ts` adding 24 lines, then runs `npm test`, which fails
- THEN the Developer sees `edit packages/core/src/domain/help.ts +24` and `run npm test ✗` with no failing count, and the gate's own "Gate: tests" with its 4 passing

#### Scenario: SCN-602 — Scrolled up, the log pauses, in the browser

- GIVEN the browser showing Live for the same build, its log following the end
- WHEN the Developer scrolls the log up and the agent writes two more lines
- THEN the Developer sees the log stay where it was with "sigue el final · sube para pausar" offering to go back, and, back at the end, the two new lines with the log following again

#### Scenario: SCN-603 — A long command, expanded, in the browser

- GIVEN the browser showing Live, and the agent running a 300-character shell command that chains `ls`, `grep` and `cat`
- WHEN the Developer hovers that line, then expands it
- THEN the Developer sees one row `run ls …` with its time and result, the whole command in the hover, and the whole command below the row once expanded

### Requirement: REQ-202 — No overlap, no dead column, no sideways scroll, at 1440×900 and 1280×800

<!-- specgate:trace actor=Developer kind=non-functional -->

The system SHALL, in every view at 1440×900 px and at 1280×800 px, with the side bar and the agent panel shown or hidden and at their minimum or their default width, draw no control or panel over another (0 px of overlap between their boxes), leave no empty column between panels after one is resized or closed (the content takes the room), and show no side panel wider than its own box (0 px of horizontal scroll in a side panel).

> Brief: "At 1440×900 and at 1280×800, no view shows two controls or panels over each other, a column left empty after a panel is resized or closed, or a side panel that scrolls sideways."

#### Scenario: SCN-604 — Live's module map inside its column, on the desktop at 1280×800

- GIVEN the desktop app at 1280×800 px building REQ-141, with 14 modules on Live's left
- WHEN the Developer opens Live
- THEN the Developer sees the module map scrolling inside its own column, the steps and SALIDA DEL AGENTE whole in the centre, and no control drawn over another

#### Scenario: SCN-605 — Build with the side bar narrowed and the agent panel closed, in the browser at 1440×900

- GIVEN the browser at 1440×900 px showing Build, with 10 uncommitted files waiting and the agent panel open
- WHEN the Developer narrows the side bar to its minimum, then closes the agent panel
- THEN the Developer sees the side bar's list with no horizontal scroll, and the content growing into the agent panel's room with no empty column left

### Requirement: REQ-203 — "Configurar agente" from Build, and Build following `harness.config.yaml`

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL offer in Build, when no agent is set, a button "Configurar agente" that runs `specgate agents init --tool claude` only after the Developer confirms it, showing it in the terminal; and SHALL show in Build the agent `harness.config.yaml` sets as soon as that file changes — by the button, a terminal or an editor — without a reload.

> Brief: "When no agent is set, Build offers "Configurar agente", which runs `specgate agents init --tool claude` after a confirmation, and Build follows `harness.config.yaml` without a reload."

#### Scenario: SCN-606 — The agent configured from Build, on the desktop

- GIVEN the desktop app showing Build with REQ-141 ready and no agent set
- WHEN the Developer presses "Configurar agente" and confirms
- THEN the Developer sees `specgate agents init --tool claude` run in the terminal, then Build naming the agent `claude` under "Quién programa", without a reload

#### Scenario: SCN-607 — Cancelled, then set from the terminal, in the browser

- GIVEN the browser showing Build with no agent set
- WHEN the Developer presses "Configurar agente", cancels, then runs `specgate config set agent "claude -p < {prompt_file}"` in the terminal
- THEN the Developer sees nothing run on cancel, then Build naming the agent `claude -p < {prompt_file}` without a reload

### Requirement: REQ-204 — The agent panel reopened from a visible button, the status bar, Ctrl/Cmd+Alt+B and the palette

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL, once the agent panel is closed, reopen it from a button always visible in the activity bar, an "Agente" item in the status bar, Ctrl/Cmd+Alt+B and the palette, each of them also closing it when it is open, as draft-workbench-v2 REQ-190 hides and shows it.

> Brief: "When the agent panel is closed, a visible button in the activity bar, an "Agente" item in the status bar, Ctrl/Cmd+Alt+B and the palette reopen it."

#### Scenario: SCN-614 — The agent panel reopened from the status bar, on the desktop

- GIVEN sprich in the desktop app with the agent panel closed by its ×
- WHEN the Developer clicks "Agente" in the status bar
- THEN the Developer sees the agent panel open on the right at its last width, and "Agente" in the status bar marked as open

#### Scenario: SCN-615 — Reopened from the activity bar, in the browser

- GIVEN sprich in the browser with the agent panel closed
- WHEN the Developer clicks the agent's button in the activity bar, closes the panel again, then presses Ctrl/Cmd+Alt+B
- THEN the Developer sees the agent panel open, then closed, then open again, the button's tooltip naming "Agente" and Ctrl/Cmd+Alt+B
