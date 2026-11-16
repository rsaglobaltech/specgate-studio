Feature: SALIDA DEL AGENTE: one timestamped line per action, following the end

  @REQ-201 @SCN-601
  Scenario: The agent's actions on REQ-012, on the desktop
    Given the desktop app building REQ-012, Live open, specgate's events giving the lines each edit added and the tests each run passed or failed
    When the agent reads `features/auth/REQ-012.feature`, edits `packages/core/test/auth/SignOut.test.ts` adding 42 lines, runs `pnpm test SignOut` with 1 failing, then runs it again with 3 passing
    Then the Developer sees four lines under SALIDA DEL AGENTE, each with its time: `read features/auth/REQ-012.feature`, `edit packages/core/test/auth/SignOut.test.ts +42`, `run pnpm test SignOut ✗ 1 failing`, `run pnpm test SignOut ✓ 3 passing`, and no raw shell command on its own row

  @REQ-201 @SCN-616
  Scenario: specgate 0.34.0 counts the lines, not the tests, on the desktop
    Given the desktop app building REQ-141 with specgate 0.34.0, whose events give the lines an edit added but no test counts
    When the agent edits `packages/core/src/domain/help.ts` adding 24 lines, then runs `npm test`, which fails
    Then the Developer sees `edit packages/core/src/domain/help.ts +24` and `run npm test ✗` with no failing count, and the gate's own "Gate: tests" with its 4 passing

  @REQ-201 @SCN-602
  Scenario: Scrolled up, the log pauses, in the browser
    Given the browser showing Live for the same build, its log following the end
    When the Developer scrolls the log up and the agent writes two more lines
    Then the Developer sees the log stay where it was with "sigue el final · sube para pausar" offering to go back, and, back at the end, the two new lines with the log following again

  @REQ-201 @SCN-603
  Scenario: A long command, expanded, in the browser
    Given the browser showing Live, and the agent running a 300-character shell command that chains `ls`, `grep` and `cat`
    When the Developer hovers that line, then expands it
    Then the Developer sees one row `run ls …` with its time and result, the whole command in the hover, and the whole command below the row once expanded
