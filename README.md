# Specgate Studio

An IDE for spec-driven development, with [specgate](https://github.com/rsaglobaltech/specgate)
underneath. It feels like VS Code and does one job: take a project from a brief
to proven, built requirements. Every feature runs a specgate command, shows it,
and says what it wrote, ran, committed or pushed.

Desktop app (macOS, Windows, Linux) with Tauri 2; the same UI in a browser with
`specgate-studio serve`.

> Status: the features of the three phases are in — the workbench, the specgate
> flow, traceability, report, settings and the desktop app — on specgate 1.0.0.
> Not done yet: a signed desktop release and its memory and start-up budgets
> (REQ-157, [docs/desktop.md](docs/desktop.md)); `npx specgate status` lists
> what is left.

On specgate 1.0 it approves a change layer by layer (discover, design, tasks)
from Changes, says when the project still needs `specgate migrate 1.0`, and
opens a workspace of several repositories (`specgate.workspace.yaml`) as its
repositories, each in its own window.

## Where things are

- `docs/brief.md` — phase 1 (the foundation): core host, specgate port,
  workspace, workbench, editor, terminal, help.
- `docs/briefs/` — phases 2 and 3.
- `docs/roadmap.md` — the phases and what "done" means for each.
- `docs/desktop.md` — the desktop app: installing it, its releases and signing.
- `docs/specs/adr/` — ADR-0001 hexagonal architecture, ADR-0002 Tauri and
  TypeScript, ADR-0003 specgate through one port.
- `spec.md`, `features/`, `docs/specs/` — the contract, checked by `specgate check`.

## Architecture

Hexagonal: a domain and its use cases in plain TypeScript with no
dependencies (`packages/core`), ports for everything outside, adapters for
specgate, the file system, git, the terminal, the agent and the window. The UI
is a driving adapter that only speaks the protocol. See ADR-0001.

## Working on it

specgate comes with the repository's dependencies (`@rsaglobaltech/specgate`
`^1.0.0`), the same one the studio runs underneath and the spec gate uses in CI.

```bash
npm install && npm run build
npx specgate status                   # what is left, and the next requirement
npx specgate check                    # the gate, as CI runs it
node apps/cli/dist/src/bin.js serve --project-dir <a project>   # the studio, in a browser
```

## License

MIT
