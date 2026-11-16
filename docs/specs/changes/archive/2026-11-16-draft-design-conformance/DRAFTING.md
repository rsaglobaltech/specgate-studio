# Drafting the design-conformance module

Turn **only the design-conformance module** of the brief into requirements and
scenarios. Nothing is built yet: this is the specification a person will
review. Specgate checks it against the brief.

The brief's `## Module: design-conformance` section is your scope: section 0 below.

- **The brief:** `docs/briefs/design-conformance.md` — the only source of business facts.
- **Write only inside:** `docs/specs/changes/draft-design-conformance/`.
- **Requirement ids:** `REQ-171` … `REQ-180`: 10 ids, no others. More are needed? `specgate draft --reserve <n>` grows the range while this is the last draft opened.
- **Scenario ids:** `SCN-511` … `SCN-540`, one each, no others.

## 0. Your scope — the design-conformance section of the brief

This is the only text you draft from. Each **rule** becomes a requirement
(quote it under `> Brief:`), each **example** a scenario of that
requirement, each **question** a row of `questions.md`.

````markdown
## Module: design-conformance

The rest of what the boards show and the studio does not.

Rules

- The studio ships its own fonts (Syne for titles, IBM Plex Sans for text, IBM Plex Mono for code) and draws with the boards' colours, 4 px corners and the orange block shadow, with no network.
- Unless they hold something, the bottom panel and the tab strip are hidden; the header carries the menu bar, the gate pill in the gate's colour and a primary Build, and the status bar shows what the open view counts.
- Home leads with the next step as a sentence with its reason, its button and its "?", then four counters, the route, the modules and the activity, and a row of common actions; in an empty folder Home asks the five questions as option cards beside "Already have code?" and the recent projects.
- Changes, Questions and Build list their items in a side panel, grouped as their boards group them, and show the selected one beside it; Live shows the modules and the queue, the current requirement, and what needs attention, in three columns.
- The "?" opens beside the button that has it, and the palette shows the selected feature's explanation beside its list, both under "[ UNDER THE HOOD ]"; the palette groups the features by area.
- Editor tabs show the file's type and, for a requirement, its id and title, and a breadcrumb shows where the open file is.
- When the connection to the host is lost, a banner and a grey status bar say so until it is back; a section being read shows its shape, a section that cannot be read names the file and line and offers to read it again, and a failed action's notice stays until it is closed and offers to retry.

Examples

- The one where Home in sprich says "Answer 2 questions of the draft pedidos", with "Answer now".
- The one where the host stops and the banner says "Reconnecting to the studio…".
- The one where the Reviewer presses the "?" beside "Ask for a change" and it opens under it with `specgate change note`.

Questions

- Is the agent panel of the shell board part of this change, a draft of its own, or left out?
- Is the menu bar the operating system's menu on the desktop app, a bar in the page on both, or left to the palette?
- What does the Help view show, since no board draws it?
````

**The values you may use** — write them exactly so; any other value goes
in `assumptions.md` or becomes a question:

`4` · `"?"` · `"Already have code?"` · `"[ UNDER THE HOOD ]"` · `"Answer 2 questions of the draft pedidos"` · `"Answer now"` · `"Reconnecting to the studio…"` · `"Ask for a change"`

**Questions to copy into `questions.md`**, each with the requirements it
blocks:

- Is the agent panel of the shell board part of this change, a draft of its own, or left out?
- Is the menu bar the operating system's menu on the desktop app, a bar in the page on both, or left to the palette?
- What does the Help view show, since no board draws it?

## 1. The requirements — `specs/design-conformance/spec.md`

Replace the placeholder with one block per requirement:

```markdown
## ADDED Requirements

### Requirement: REQ-171 — <a short name>

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL <what it does, observably>.

> Brief: "<the sentence of the brief this comes from>"

#### Scenario: SCN-511 — <what happens>

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
| A1 | HTTP answers: 201 created, 409 taken | REQ-171 | REST convention | to confirm |
```

## 3. What only the client can decide — `questions.md`

Prices, limits, legal, clinical or teaching rules that the brief leaves
open are **questions, not guesses**. Never invent a business rule.

```markdown
| # | Question | Blocks | Options seen | Answer | Status |
|---|---|---|---|---|---|
| Q1 | <the question, in the client's words> | REQ-171 | <what you could imagine> |  | open |
```

A requirement a question blocks carries `status="Needs Clarification"` in
its trace: nobody builds it until someone answers.

## 4. Check it, until it is ready

```bash
specgate propose --from-brief design-conformance
```

Fix every finding and run it again, until it says **Ready to review**. A
`D6_unlisted_value` means a value the brief never gave: use the brief's
value, list it in `assumptions.md`, or turn it into a question.

Do not archive. A person reads the draft and answers what they can in
`questions.md`. Each requirement is then built test first and delivered with
`specgate apply REQ-NNN`; once all are applied, a person runs `specgate archive draft-design-conformance`.
