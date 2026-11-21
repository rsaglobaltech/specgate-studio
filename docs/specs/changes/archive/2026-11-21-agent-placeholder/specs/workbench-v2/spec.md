# Delta — agent-placeholder

## ADDED Requirements

### Requirement: REQ-232 — The agent's input suggests a question about the project's own draft

<!-- specgate:trace status=Implemented actor=Reviewer kind=functional -->

The system SHALL show in the agent's input, while it is empty, "¿Qué falta para aprobar <module>?" / "What is missing to approve <module>?" when the project has exactly one open draft change (`draft-<module>`), naming that module; and "Pregunta sobre la spec…" / "Ask about the spec…" when it has none or more than one. The suggestion SHALL change when the open changes change, and SHALL NOT name a module that is not the project's.

> In a real project, the input read "What is missing to approve pedidos?" — the module of the demo sprich — whatever the project held.

#### Scenario: SCN-1012 — sprich, with draft-pedidos open, in Spanish

- GIVEN sprich with one open draft change, draft-pedidos, in Spanish
- WHEN the Reviewer looks at the agent's empty input
- THEN it suggests "¿Qué falta para aprobar pedidos?"

#### Scenario: SCN-1013 — A project with no draft open, in English

- GIVEN a project with no open draft change, in English
- WHEN the Developer looks at the agent's empty input
- THEN it suggests "Ask about the spec…" and names no module
