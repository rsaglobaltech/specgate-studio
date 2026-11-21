# Discover: specgate-1-4-setup

> Owner: product — what the business needs and why. No technology here: the
> design says how.

Source: issue #40, parts 2 to 5, "Follow specgate 1.3 and 1.4.1". Part 1 (Why
and Quality in the brief's form) waits for specgate: its form does not carry
those sections yet (rsaglobaltech/specgate#524).

## Context

specgate 1.4 changed what a project looks like right after setup:

- A folder with no build manifest is adopted as a new project whose stack and
  test toolchain are undecided (`Stack: TBD`, `Testing: TBD` in `AGENTS.md`),
  and the agent's contract tells it to stop there. The studio says nothing
  about it, and Build would hand an agent a contract that stops it.
- Adopted code gets a baseline requirement, REQ-001 "Preserve existing
  behaviour". It stays pending until a test names it, so the studio counts it
  as work to do for good. The studio also still takes REQ-000 as the
  baseline.

## Use case

1. The Developer adopts a folder with no code. The readiness list shows Stack and Testing as to decide, and Home says to decide the stack first.
2. The Developer writes the stack in the readiness list. The studio saves it through specgate, and `AGENTS.md` says it.
3. The Developer adopts a folder with code. Home does not count the baseline as work to do, and says how it is closed.

## Acceptance criteria

- AC-1: Opening a project whose `AGENTS.md` says `Stack: TBD` shows it, and setting it from the studio writes `AGENTS.md`.
- AC-2: The stack and the test toolchain can be read and changed in Settings.
- AC-3: After adoption of a project with code, Home does not count REQ-001 as work to do, and Build lists it only when the Developer names it.
- AC-4: A project adopted with no code counts its baseline like any other requirement.
