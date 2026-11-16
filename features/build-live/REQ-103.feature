Feature: Live as the "En vivo" board: the harness's stages, a header with counts, time and usage, the queue and what is finished

  @REQ-103 @SCN-305
  Scenario: Live during the build of REQ-141 on the desktop
    Given the desktop app building REQ-141 in its first attempt of 3, REQ-142 queued after it, and the setup `npm ci` done in 4,5 s
    When the Developer opens Live
    Then the Developer sees "Rama creada ✓ —", the setup ✓ 4,5 s, "Agente escribiendo" ● with its timer advancing, the three gates and "Aplicar · commit en su rama" ○, "intento 1 de 3", REQ-142 in the queue with its estimate, and the header's counts, elapsed time, tokens, turns and "≈ 1,10 $ precio de API"

  @REQ-103 @SCN-306
  Scenario: Live opened in a second browser tab mid-build
    Given a build of REQ-141 started in one browser tab, its agent writing for 3:41
    When the Developer opens Live in a second tab
    Then the Developer sees the same steps with "Agente escribiendo" at 3:41 and advancing, the queue, the header's counts, tokens, turns and "≈ $0.42 API price"

  @REQ-103 @SCN-612
  Scenario: The first seconds are never empty, on the desktop
    Given the desktop app, the Developer having just pressed Build on REQ-141, the setup `npm ci` running and the agent not yet started
    When the Developer opens Live
    Then the Developer sees "Rama creada ✓", the setup ● with its timer advancing and the other stages ○, never "No se está construyendo ningún requisito"

  @REQ-103 @SCN-613
  Scenario: A finished requirement and a failed gate, in the browser
    Given the browser showing Live, REQ-141 passed in 9 min for 0,57 $ at API prices, and REQ-142's "Gate: tests" failing in its first attempt
    When the Developer looks at Live
    Then the Developer sees REQ-141 under TERMINADOS with ✓, its time, its tokens and "≈ 0,57 $", the header counting 1 passed, "Gate: tests" ✗ with its time on REQ-142, and "intento 2 de 3" starting

  @REQ-103 @SCN-633
  Scenario: Each queued run echoed with its own button, on the desktop
    Given the desktop app building REQ-141, the Developer having pressed "Construir REQ-142" and then "Construir REQ-143", both queued
    When REQ-141 ends and REQ-142 starts, then REQ-143
    Then the Developer sees in the studio's terminal `▶ "Construir REQ-142" · specgate harness run --req REQ-142`, then `▶ "Construir REQ-143" · specgate harness run --req REQ-143`

  @REQ-103 @SCN-634
  Scenario: "Rama creada" not charged with the wait, in the browser
    Given the browser, REQ-142's turn come 33 s before its first event, and specgate giving no time for its branch
    When the Developer opens Live
    Then the Developer sees "Rama creada ✓ —", not "33 s", and the setup with its own time
