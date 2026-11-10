# Drafting the editor module

Turn **only the editor module** of the brief into requirements and
scenarios. Nothing is built yet: this is the specification a person will
review. Specgate checks it against the brief.

The brief's `## Module: editor` section is your scope: section 0 below.

- **The brief:** `docs/brief.md` — the only source of business facts.
- **Write only inside:** `docs/specs/changes/draft-editor/`.
- **Requirement ids:** `REQ-041` … `REQ-050`: 10 ids, no others. More are needed? `specgate draft --reserve <n>` grows the range while this is the last draft opened.
- **Scenario ids:** `SCN-121` … `SCN-150`, one each, no others.

## 0. Your scope — the editor section of the brief

This is the only text you draft from. Each **rule** becomes a requirement
(quote it under `> Brief:`), each **example** a scenario of that
requirement, each **question** a row of `questions.md`.

````markdown
## Module: editor

Editing the specification as code.

Rules

- When a file is first opened, the Monaco editor loads; not before.
- Above each requirement: Build, Check, Trace, Ask for a change, and a help button.
- Findings of the gate and the brief check are underlined where they are, with their fix.
- When a question blocks a requirement, it shows inline under it, with its options, for the Reviewer to answer.
- Saving writes the file; nothing else is written without the person.

Examples

- The one where REQ-031's "until it is shipped" is underlined because Q2 is open.

Questions

- CodeMirror 6 instead of Monaco if Monaco breaks the startup budget?
````

**The values you may use** — write them exactly so; any other value goes
in `assumptions.md` or becomes a question:

`"until it is shipped"` · `031`

**Questions to copy into `questions.md`**, each with the requirements it
blocks:

- CodeMirror 6 instead of Monaco if Monaco breaks the startup budget?

## 1. The requirements — `specs/editor/spec.md`

Replace the placeholder with one block per requirement:

```markdown
## ADDED Requirements

### Requirement: REQ-041 — <a short name>

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL <what it does, observably>.

> Brief: "<the sentence of the brief this comes from>"

#### Scenario: SCN-121 — <what happens>

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
| A1 | HTTP answers: 201 created, 409 taken | REQ-041 | REST convention | to confirm |
```

## 3. What only the client can decide — `questions.md`

Prices, limits, legal, clinical or teaching rules that the brief leaves
open are **questions, not guesses**. Never invent a business rule.

```markdown
| # | Question | Blocks | Options seen | Answer | Status |
|---|---|---|---|---|---|
| Q1 | <the question, in the client's words> | REQ-041 | <what you could imagine> |  | open |
```

A requirement a question blocks carries `status="Needs Clarification"` in
its trace: nobody builds it until someone answers.

## 4. Check it, until it is ready

```bash
specgate propose --from-brief editor
```

Fix every finding and run it again, until it says **Ready to review**. A
`D6_unlisted_value` means a value the brief never gave: use the brief's
value, list it in `assumptions.md`, or turn it into a question.

Do not archive. A person reads the draft and answers what they can in
`questions.md`. Each requirement is then built test first and delivered with
`specgate apply REQ-NNN`; once all are applied, a person runs `specgate archive draft-editor`.
