# ADR-0001 — Hexagonal architecture: a dependency-free core, ports, adapters

Status: accepted · 2026-11-09

## Context

Specgate Studio runs in three places: a desktop window (Tauri), a browser
(`specgate-studio serve`) and, later, Specgate Cloud. What it does — open a
project, read its specification, run specgate, follow a build, answer a
question — is the same in all three. What differs is everything around it: the
window, the terminal, how specgate is called, the file system, git, the agent.

The first studio (inside specgate) grew its logic in route handlers and page
components, and every action spawned a new specgate process. Both made it slow
and hard to test.

## Decision

Ports and adapters, in an npm workspace:

```
packages/
  core/                 domain + application. Plain TypeScript, ZERO runtime dependencies.
    src/domain/         entities and values: Project, Requirement, Change, Question,
                        Finding, CommandRun, GitState… — pure functions, no I/O.
    src/application/    use cases (OpenProject, RunGate, AnswerQuestion, …),
                        one class per use case, depending on ports only.
    src/ports/          driven ports: SpecgatePort, FileSystemPort, WatcherPort,
                        GitPort, TerminalPort, AgentPort, ClockPort, StorePort.
                        driving port: StudioApi (what the UI may ask).
  adapter-specgate-cli/ SpecgatePort over the specgate CLI with --json.
  adapter-specgate-api/ SpecgatePort in process, once specgate publishes an API (ADR-0003).
  adapter-node/         FileSystemPort, WatcherPort, GitPort, StorePort for Node.
  adapter-pty-node/     TerminalPort with node-pty (web host).
  host/                 the core host: wires adapters into use cases, serves StudioApi
                        over JSON-RPC (WebSocket), caches state, emits events.
  protocol/             the JSON-RPC contract shared by host and UI: types only.
apps/
  ui/                   Preact + Monaco + xterm.js. A driving adapter: it calls
                        StudioApi through protocol/ and renders; no business rule.
  desktop/              Tauri 2: the window, the Rust pty, the host as a sidecar.
  cli/                  `specgate-studio serve` and `open`.
```

Dependency rules, checked by the gate (`arch_cmd`, dependency-cruiser):

1. `core` imports nothing outside `core` — no Node built-ins, no packages.
2. `core/domain` imports nothing from `core/application` or `core/ports`.
3. Adapters import `core` (ports and domain types); `core` never imports an adapter.
4. `apps/ui` imports `protocol` only — never `core`, `host` or an adapter.
5. Only `host` and `apps/desktop` wire adapters together.

Every port has a contract test in `core/test/contracts/`, run against each of
its adapters and against an in-memory fake used by the use-case tests.

## Consequences

- Use cases are tested in milliseconds with fakes; adapters are tested against
  their contracts once.
- The UI cannot hide a rule: a business decision in a component breaks rule 4.
- Swapping the specgate adapter (CLI → in-process), the pty (node-pty → Rust) or
  the shell (Tauri → Electron) touches one package.
- More packages than a single app; the workspace keeps builds incremental.
