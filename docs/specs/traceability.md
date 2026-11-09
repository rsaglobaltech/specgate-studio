<!-- specgate:derived — generated from spec.md, features/ and tests. Do not edit by hand: run `specgate matrix`. -->
# Traceability Matrix

Map requirements to scenarios, domain model elements, implementation artifacts, and tests.

| Requirement | Scenario ID | Feature file | Use Case | Command/Query | Aggregate | Event | Technical artifact | Test artifact | Status |
|---|---|---|---|---|---|---|---|---|---|
| REQ-000 | SCN-000 | `features/core/health.feature` | UC-000 Health baseline | QRY-000 HealthCheckQuery | - | - | `API /health, smoke test` | TBD | Draft |
| REQ-001 | SCN-001 | `features/core-host/REQ-001.feature` | - | - | - | - | `packages/core/src/contracts/specgateContract.ts, packages/core/src/fakes/InMemorySpecgate.ts, packages/host/src/startHost.ts, packages/protocol/src/index.ts` | packages/adapter-specgate-cli/test/cli-adapter.test.ts, packages/adapter-specgate-cli/test/contract.test.ts, packages/host/test/host.test.ts | Implemented |
| REQ-002 | SCN-003 | `features/core-host/REQ-002.feature` | - | - | - | - | `packages/core/src/application/ProjectState.ts, packages/core/src/domain/section.ts, packages/host/src/startHost.ts` | packages/core/test/project-state.test.ts | Implemented |
| REQ-003 | SCN-005 | `features/core-host/REQ-003.feature` | - | - | - | - | `packages/core/src/application/ProjectState.ts, packages/core/src/domain/fedBy.ts` | packages/adapter-specgate-cli/test/cli-adapter.test.ts, packages/core/test/project-state.test.ts, packages/core/test/sections-fed-by.test.ts | Implemented |
| REQ-004 | SCN-007 | `features/core-host/REQ-004.feature` | - | - | - | - | - | packages/host/test/host.test.ts | Implemented |
| REQ-005 | SCN-009 | `features/core-host/REQ-005.feature` | - | - | - | - | `packages/core/src/application/Commands.ts, packages/core/src/domain/command.ts, packages/host/src/NodeProcessRunner.ts` | packages/core/test/commands.test.ts, packages/host/test/node-runner.test.ts | Implemented |
| REQ-006 | SCN-011 | `features/core-host/REQ-006.feature` | - | - | - | - | `packages/core/src/application/Commands.ts, packages/core/src/domain/command.ts` | packages/core/test/commands.test.ts | Implemented |
| REQ-007 | SCN-013 | `features/core-host/REQ-007.feature` | - | - | - | - | `packages/core/src/domain/command.ts, packages/core/src/ports/ProcessRunner.ts, packages/host/src/NodeProcessRunner.ts` | packages/core/test/commands.test.ts, packages/host/test/node-runner.test.ts | Implemented |
