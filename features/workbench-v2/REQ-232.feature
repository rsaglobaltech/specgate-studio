Feature: The agent's input suggests a question about the project's own draft

  @REQ-232 @SCN-1012
  Scenario: sprich, with draft-pedidos open, in Spanish
    Given sprich with one open draft change, draft-pedidos, in Spanish
    When the Reviewer looks at the agent's empty input
    Then it suggests "¿Qué falta para aprobar pedidos?"

  @REQ-232 @SCN-1013
  Scenario: A project with no draft open, in English
    Given a project with no open draft change, in English
    When the Developer looks at the agent's empty input
    Then it suggests "Ask about the spec…" and names no module
