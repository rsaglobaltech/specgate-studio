# Specgate Studio

An IDE for spec-driven development, with [specgate](https://github.com/rsaglobaltech/specgate)
underneath. It feels like VS Code and does one job: take a project from a brief
to proven, built requirements. Every feature runs a specgate command, shows it,
and says what it wrote, ran, committed or pushed.

Desktop app (macOS, Windows, Linux) with Tauri 2; the same UI in a browser with
`specgate-studio serve`.

> Status: planning. The specification is written first, with specgate itself.

## Where things are

- `docs/brief.md` — phase 1 (the foundation): core host, specgate port,
  workspace, workbench, editor, terminal, help.
- `docs/briefs/` — phases 2 and 3.
- `docs/roadmap.md` — the phases and what "done" means for each.
- `docs/specs/adr/` — ADR-0001 hexagonal architecture, ADR-0002 Tauri and
  TypeScript, ADR-0003 specgate through one port.
- `spec.md`, `features/`, `docs/specs/` — the contract, checked by `specgate check`.

## Architecture

Hexagonal: a domain and its use cases in plain TypeScript with no
dependencies (`packages/core`), ports for everything outside, adapters for
specgate, the file system, git, the terminal, the agent and the window. The UI
is a driving adapter that only speaks the protocol. See ADR-0001.

## Working on it

```bash
npm i -g @rsaglobaltech/specgate@^0.30.0
specgate status                       # what is left, and the next requirement
specgate propose --from-brief         # the brief's modules and where each stands
specgate check                        # the gate, as CI runs it
```

## License

MIT
