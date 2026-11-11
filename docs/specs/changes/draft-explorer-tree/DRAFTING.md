# Drafting the explorer-tree module

Turn **only the explorer-tree module** of the brief into requirements and
scenarios. Nothing is built yet: this is the specification a person will
review. Specgate checks it against the brief.

The brief's `## Module: explorer-tree` section is your scope: section 0 below.

- **The brief:** `docs/briefs/design-conformance.md` — the only source of business facts.
- **Write only inside:** `docs/specs/changes/draft-explorer-tree/`.
- **Requirement ids:** `REQ-161` … `REQ-170`: 10 ids, no others. More are needed? `specgate draft --reserve <n>` grows the range while this is the last draft opened.
- **Scenario ids:** `SCN-481` … `SCN-510`, one each, no others.

## 0. Your scope — the explorer-tree section of the brief

This is the only text you draft from. Each **rule** becomes a requirement
(quote it under `> Brief:`), each **example** a scenario of that
requirement, each **question** a row of `questions.md`.

````markdown
## Module: explorer-tree

The project's files as a tree in the side panel, as the shell board draws it.

Rules

- Folders open and close one level at a time and only the opened folder is read, so that in a project of 50,000 files a folder's children show in under 50 ms; the folders left open are kept per project.
- Each row, in the side panel the boards draw (a 36 px uppercase header with its "?", the orange inset on the current row), shows its file type's icon, and spec.md, docs/specs and features are marked as the specification.
- Each file changed in git shows its letter in its colour (M modified, U untracked, A added), and a folder holding a change shows a dot.
- When a file becomes the active editor tab, the tree opens the folders above it and selects it.
- When the tree has the focus, the arrow keys move and open or close folders, Enter opens, F2 renames and Delete deletes.
- A context menu offers new file, new folder, rename, delete after a confirmation, copy path and open in terminal; each write goes through the host's file port, only from the studio's own page and never outside the project, and has its "?" and its notice in English and Spanish.
- The filter shows the matching files inside their folders, and what .gitignore and the studio's ignore rules name is never shown.

Examples

- The one where the Developer opens `packages/core` in sprich and its children show at once, without the rest of the 50,000 files being read.
- The one where `docs/brief.md` shows M in amber and the folder `docs` a dot.
- The one where F2 on `docs/notes.md` renames it to `docs/notes-old.md`.

Questions

- How tall is a row: 26 px as the shell board's explorer, or 30 px as the Changes board's list?
- Does Delete move the file to the trash or remove it for good?
- Does the side panel show only the file tree, or the shell board's spec sections and its modules and requirements above it?
````

**The values you may use** — write them exactly so; any other value goes
in `assumptions.md` or becomes a question:

`50,000` · `50` · `"?"` · `36`

**Questions to copy into `questions.md`**, each with the requirements it
blocks:

- How tall is a row: 26 px as the shell board's explorer, or 30 px as the Changes board's list?
- Does Delete move the file to the trash or remove it for good?
- Does the side panel show only the file tree, or the shell board's spec sections and its modules and requirements above it?

## 1. The requirements — `specs/explorer-tree/spec.md`

Replace the placeholder with one block per requirement:

```markdown
## ADDED Requirements

### Requirement: REQ-161 — <a short name>

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL <what it does, observably>.

> Brief: "<the sentence of the brief this comes from>"

#### Scenario: SCN-481 — <what happens>

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
| A1 | HTTP answers: 201 created, 409 taken | REQ-161 | REST convention | to confirm |
```

## 3. What only the client can decide — `questions.md`

Prices, limits, legal, clinical or teaching rules that the brief leaves
open are **questions, not guesses**. Never invent a business rule.

```markdown
| # | Question | Blocks | Options seen | Answer | Status |
|---|---|---|---|---|---|
| Q1 | <the question, in the client's words> | REQ-161 | <what you could imagine> |  | open |
```

A requirement a question blocks carries `status="Needs Clarification"` in
its trace: nobody builds it until someone answers.

## 4. Check it, until it is ready

```bash
specgate propose --from-brief explorer-tree
```

Fix every finding and run it again, until it says **Ready to review**. A
`D6_unlisted_value` means a value the brief never gave: use the brief's
value, list it in `assumptions.md`, or turn it into a question.

Do not archive. A person reads the draft and answers what they can in
`questions.md`. Each requirement is then built test first and delivered with
`specgate apply REQ-NNN`; once all are applied, a person runs `specgate archive draft-explorer-tree`.
