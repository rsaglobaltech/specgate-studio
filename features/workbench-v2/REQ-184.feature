Feature: The bottom panel always there: TERMINAL, GATE, PROBLEMAS, SALIDA DEL AGENTE, TRAZABILIDAD

  @REQ-184 @SCN-548
  Scenario: Questions with the panel, on the desktop
    Given sprich in the desktop app, in Spanish, with no file and no terminal open
    When the Developer opens Questions
    Then the Developer sees the bottom panel with TERMINAL, GATE, PROBLEMAS, SALIDA DEL AGENTE and TRAZABILIDAD, and on its right "zsh · ~/mvp/sprich" and "+"

  @REQ-184 @SCN-549
  Scenario: "+" opens a terminal, in the browser
    Given sprich in the browser with the bottom panel showing
    When the Developer presses "+"
    Then the Developer sees a new terminal in sprich's folder, its shell's prompt ready
