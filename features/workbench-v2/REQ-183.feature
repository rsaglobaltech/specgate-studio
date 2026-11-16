Feature: Ask the project's agent, @ naming a requirement or a file

  @REQ-183 @SCN-546
  Scenario: The Reviewer asks about pedidos, on the desktop in Spanish
    Given the Reviewer in sprich in the desktop app, in Spanish
    When the Reviewer types "¿Qué falta para aprobar pedidos?" in "Pide algo sobre la spec; @ nombra un requisito o un archivo" and sends it
    Then the Reviewer sees the request on the right, the agent's answer or plan under it, and in the terminal the specgate command that ran it

  @REQ-183 @SCN-547
  Scenario: @ offers REQ-031, in the browser
    Given the Reviewer in sprich in the browser
    When the Reviewer types "@REQ-03" in the agent's input
    Then the Reviewer sees REQ-031 and REQ-034 offered with their titles, and choosing REQ-031 puts "@REQ-031" in the request
