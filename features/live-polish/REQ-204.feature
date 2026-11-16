Feature: The agent panel reopened from a visible button, the status bar, Ctrl/Cmd+Alt+B and the palette

  @REQ-204 @SCN-614
  Scenario: The agent panel reopened from the status bar, on the desktop
    Given sprich in the desktop app with the agent panel closed by its ×
    When the Developer clicks "Agente" in the status bar
    Then the Developer sees the agent panel open on the right at its last width, and "Agente" in the status bar marked as open

  @REQ-204 @SCN-615
  Scenario: Reopened from the activity bar, in the browser
    Given sprich in the browser with the agent panel closed
    When the Developer clicks the agent's button in the activity bar, closes the panel again, then presses Ctrl/Cmd+Alt+B
    Then the Developer sees the agent panel open, then closed, then open again, the button's tooltip naming "Agente" and Ctrl/Cmd+Alt+B
