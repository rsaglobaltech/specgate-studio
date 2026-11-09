# ADR-0003 — Specgate through one port, two adapters

Status: accepted · 2026-11-09

## Context

Every feature of the studio is a specgate command. Spawning the CLI per action
costs 0.2–2 s and parses prose; calling specgate in process is fast but needs a
public, versioned API that specgate does not publish yet.

## Decision

- The core depends on `SpecgatePort`: typed methods (`status()`, `check()`,
  `apply(req)`, `answer(q, text)`, `proposeFromTicket(key, opts)`, …), each
  returning data and the findings with their fix, never prose.
- **Adapter 1 — CLI:** runs `specgate <command> --json` with arguments as an
  array, no shell; checks the specgate version at start and says how to update.
  Ships first.
- **Adapter 2 — in process:** calls a public API that specgate will export
  (`@rsaglobaltech/specgate/api`), proposed as a change in the specgate repo.
  Replaces adapter 1 where it exists; adapter 1 stays as the fallback.
- One contract test suite runs against both adapters and the fake.
- Commands without `--json` today are listed in the specgate-port module and
  become specgate changes before the studio relies on them.

## Consequences

- The studio is usable from day one with the specgate already installed.
- The speed target (a section in < 50 ms) is met by the host's cache first and
  by adapter 2 later, not by parsing CLI text faster.
