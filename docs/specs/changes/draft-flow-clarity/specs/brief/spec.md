# Delta — brief

## ADDED Requirements

### Requirement: REQ-241 — "Draft the modules" fixes a draft with findings, and shows each module as it goes

<!-- specgate:trace status=Implemented actor=Developer kind=functional -->

The system SHALL, when "Draft the modules" leaves a module's draft with specgate's errors, run the project's agent on that draft again — at most two more passes — before it stops at that module (REQ-073); and SHALL show, in the Brief view while it runs, every module to draft in order with its state — drafted and ready to review, being drafted by the agent with its seconds, being fixed with its pass (1 of 2, 2 of 2), still to come, or stopped with the number of its findings and a way to see them in Changes — and the count of modules done and the time so far.

> In a real project, "Draft the modules" stopped at the first module with six findings and never drafted the other six; the Developer saw it only in the terminal.

#### Scenario: SCN-1018 — A draft fixed on the second pass, in the browser

- GIVEN sprich in the browser with the modules pedidos and pagos to draft, and an agent whose first draft of pedidos has one finding and whose second has none
- WHEN the Developer presses "Draft the modules"
- THEN pedidos shows as being fixed (pass 1 of 2) and then ready to review, pagos is drafted after it, and the panel ends with 2 of 2 modules done

#### Scenario: SCN-1019 — A draft still with findings after two passes, on the desktop

- GIVEN sprich on the desktop, and an agent whose drafts of pedidos keep one finding
- WHEN the Developer presses "Draft the modules"
- THEN pedidos is drafted once and fixed twice, then shows as stopped with 1 finding and "See it in Changes"; pagos shows as still to come and was not drafted
