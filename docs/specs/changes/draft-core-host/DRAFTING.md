# Drafting the core-host module

Turn **only the core-host module** of the brief into requirements and
scenarios. Nothing is built yet: this is the specification a person will
review. Specgate checks it against the brief.

The brief's `## Module: core-host` section is your scope: section 0 below.

- **The brief:** `docs/brief.md` — the only source of business facts.
- **Write only inside:** `docs/specs/changes/draft-core-host/`.
- **Requirement ids:** `REQ-001` … `REQ-010`: 10 ids, no others. More are needed? `specgate draft --reserve <n>` grows the range while this is the last draft opened.
- **Scenario ids:** `SCN-001` … `SCN-030`, one each, no others.

## 0. Your scope — the core-host section of the brief

This is the only text you draft from. Each **rule** becomes a requirement
(quote it under `> Brief:`), each **example** a scenario of that
requirement, each **question** a row of `questions.md`.

````markdown
## Module: core-host

The long-lived process that holds the project's state and serves the UI.

Rules

- When a Developer opens a project, one core host starts for it, and the UI talks to it over a typed JSON-RPC transport.
- When the project is first read, its state (requirements, changes, questions, matrix, gate) is kept in memory.
- When a file of the specification changes, only the parts of the state that file feeds are read again.
- After the first read, a section's data is answered in under 50 ms.
- When the host runs a command, the UI can follow it as events: started, output, ended with its exit code.
- While a write command runs, a second one is refused, naming the one that runs.
- The host passes arguments as an array and never runs a shell.

Examples

- The one where `status` takes 1.9 s on the first read of sprich and 20 ms after it.
- The one where `docs/specs/changes/draft-pedidos/questions.md` is saved and only Questions and the matrix are read again.

Questions

- Is the transport WebSocket for both desktop and web, or stdio for the desktop sidecar?
````

**The values you may use** — write them exactly so; any other value goes
in `assumptions.md` or becomes a question:

`50` · `1.9` · `20`

**Questions to copy into `questions.md`**, each with the requirements it
blocks:

- Is the transport WebSocket for both desktop and web, or stdio for the desktop sidecar?

## 1. The requirements — `specs/core-host/spec.md`

Replace the placeholder with one block per requirement:

```markdown
## ADDED Requirements

### Requirement: REQ-001 — <a short name>

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL <what it does, observably>.

> Brief: "<the sentence of the brief this comes from>"

#### Scenario: SCN-001 — <what happens>

- GIVEN <a concrete state>
- WHEN <the actor does one thing>
- THEN <what they get back, with values a test can assert>
```

- `kind` is `functional`, `business-rule` or `non-functional`. A
  non-functional requirement states a number with a unit.
- Quote the brief under every requirement. If no sentence supports it, it
  does not belong in this draft.
- Concrete values — "the centre court on Monday at 18:00", never "a court".
- Steps are plain `- GIVEN` / `- WHEN` / `- THEN` lines.

Each requirement names one actor in its trace, and gets one scenario per
surface that actor uses:

- **Developer** — a desktop scenario (WHEN they open or tap something, THEN what they see); a web scenario (WHEN they open or tap something, THEN what they see)
- **Reviewer** — a desktop scenario (WHEN they open or tap something, THEN what they see); a web scenario (WHEN they open or tap something, THEN what they see)

## 2. What the brief does not say — `assumptions.md`

Every value in a scenario that the brief does not give — a limit, a status
code, a button label — gets a row naming where it is used:

```markdown
| # | Assumption | Used in | Why | Status |
|---|---|---|---|---|
| A1 | HTTP answers: 201 created, 409 taken | REQ-001 | REST convention | to confirm |
```

## 3. What only the client can decide — `questions.md`

Prices, limits, legal, clinical or teaching rules that the brief leaves
open are **questions, not guesses**. Never invent a business rule.

```markdown
| # | Question | Blocks | Options seen | Answer | Status |
|---|---|---|---|---|---|
| Q1 | <the question, in the client's words> | REQ-001 | <what you could imagine> |  | open |
```

A requirement a question blocks carries `status="Needs Clarification"` in
its trace: nobody builds it until someone answers.

## 4. Check it, until it is ready

```bash
specgate propose --from-brief core-host
```

Fix every finding and run it again, until it says **Ready to review**. A
`D6_unlisted_value` means a value the brief never gave: use the brief's
value, list it in `assumptions.md`, or turn it into a question.

Do not archive. A person reads the draft and answers what they can in
`questions.md`. Each requirement is then built test first and delivered with
`specgate apply REQ-NNN`; once all are applied, a person runs `specgate archive draft-core-host`.
