# Drafting the specgate-port module

Turn **only the specgate-port module** of the brief into requirements and
scenarios. Nothing is built yet: this is the specification a person will
review. Specgate checks it against the brief.

The brief's `## Module: specgate-port` section is your scope: section 0 below.

- **The brief:** `docs/brief.md` — the only source of business facts.
- **Write only inside:** `docs/specs/changes/draft-specgate-port/`.
- **Requirement ids:** `REQ-011` … `REQ-020`: 10 ids, no others. More are needed? `specgate draft --reserve <n>` grows the range while this is the last draft opened.
- **Scenario ids:** `SCN-031` … `SCN-060`, one each, no others.

## 0. Your scope — the specgate-port section of the brief

This is the only text you draft from. Each **rule** becomes a requirement
(quote it under `> Brief:`), each **example** a scenario of that
requirement, each **question** a row of `questions.md`.

````markdown
## Module: specgate-port

How the studio uses specgate: one port, two adapters.

Rules

- The core depends on a `SpecgatePort` interface only, never on the specgate package.
- The first adapter runs the specgate CLI with `--json` and parses its output.
- When the host starts, it checks the installed specgate version against the one it needs.
- Once specgate publishes a public API, a second adapter calls it in process.
- Both adapters pass the same contract tests.
- When the UI asks for a command the port does not offer, it is refused before anything runs.

Examples

- The one where the installed specgate is 0.29.1 and the studio needs 0.30.0: the Developer is told so and how to update.
- The one where `apply REQ-007` is refused and the port returns the finding `apply_no_test` with its fix.

Questions

- Which specgate commands lack a `--json` output today?
````

**The values you may use** — write them exactly so; any other value goes
in `assumptions.md` or becomes a question:

`0.29.1` · `0.30.0`

**Questions to copy into `questions.md`**, each with the requirements it
blocks:

- Which specgate commands lack a `--json` output today?

## 1. The requirements — `specs/specgate-port/spec.md`

Replace the placeholder with one block per requirement:

```markdown
## ADDED Requirements

### Requirement: REQ-011 — <a short name>

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL <what it does, observably>.

> Brief: "<the sentence of the brief this comes from>"

#### Scenario: SCN-031 — <what happens>

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
| A1 | HTTP answers: 201 created, 409 taken | REQ-011 | REST convention | to confirm |
```

## 3. What only the client can decide — `questions.md`

Prices, limits, legal, clinical or teaching rules that the brief leaves
open are **questions, not guesses**. Never invent a business rule.

```markdown
| # | Question | Blocks | Options seen | Answer | Status |
|---|---|---|---|---|---|
| Q1 | <the question, in the client's words> | REQ-011 | <what you could imagine> |  | open |
```

A requirement a question blocks carries `status="Needs Clarification"` in
its trace: nobody builds it until someone answers.

## 4. Check it, until it is ready

```bash
specgate propose --from-brief specgate-port
```

Fix every finding and run it again, until it says **Ready to review**. A
`D6_unlisted_value` means a value the brief never gave: use the brief's
value, list it in `assumptions.md`, or turn it into a question.

Do not archive. A person reads the draft and answers what they can in
`questions.md`. Each requirement is then built test first and delivered with
`specgate apply REQ-NNN`; once all are applied, a person runs `specgate archive draft-specgate-port`.
