# Drafting the live-polish module

Turn **only the live-polish module** of the brief into requirements and
scenarios. Nothing is built yet: this is the specification a person will
review. Specgate checks it against the brief.

The brief's `## Module: live-polish` section is your scope: section 0 below.

- **The brief:** `docs/briefs/live-polish.md` — the only source of business facts.
- **Write only inside:** `docs/specs/changes/draft-live-polish/`.
- **Requirement ids:** `REQ-201` … `REQ-210`: 10 ids, no others. More are needed? `specgate draft --reserve <n>` grows the range while this is the last draft opened.
- **Scenario ids:** `SCN-601` … `SCN-630`, one each, no others.

## 0. Your scope — the live-polish section of the brief

This is the only text you draft from. Each **rule** becomes a requirement
(quote it under `> Brief:`), each **example** a scenario of that
requirement, each **question** a row of `questions.md`.

````markdown
## Module: live-polish

Live as the "En vivo" board draws it, the agent panel always reachable, and a layout that never overlaps.

Rules

- While a build runs, Live shows the harness's stages for each requirement — "Rama creada", the setup, "intento N de M", "Agente escribiendo · test primero, después el código" with a running timer, "Gate: validate", "Gate: tests", "Gate: arquitectura" and "Aplicar · commit en su rama" — each with ✓, ●, ○ or ✗ and its time; a header with passed, running and failed counts, the time elapsed, tokens, cost, "Parar tras este requisito" and "Parar ya…"; the modules and the queue with estimates on the left; NECESITA ATENCIÓN and TERMINADOS with time and cost on the right.
- While the agent works, SALIDA DEL AGENTE shows one timestamped line per action — read, edit with the lines added, run with the tests passing or failing, ask — with the full command on hover or when expanded, and follows the end unless the Developer scrolls up ("sigue el final · sube para pausar").
- When the agent panel is closed, a visible button in the activity bar, an "Agente" item in the status bar, Ctrl/Cmd+Alt+B and the palette reopen it.
- At 1440×900 and at 1280×800, no view shows two controls or panels over each other, a column left empty after a panel is resized or closed, or a side panel that scrolls sideways.
- When Build lists what is ready, each requirement shows its title with its estimate below it, and REQ-000, the adoption baseline, appears only once the Developer names it.
- When no agent is set, Build offers "Configurar agente", which runs `specgate agents init --tool claude` after a confirmation, and Build follows `harness.config.yaml` without a reload.
- When the Developer commits uncommitted work before a build, the dialog shows a labelled message field, and Confirm says why it is disabled until a message is written.

Examples

- The one where REQ-141 builds and Live shows "Rama creada ✓ 0,2 s", the setup `npm ci` done in 4,5 s, and "Agente escribiendo" with its timer at 3:41.
- The one where the agent reads `features/auth/REQ-012.feature`, edits `packages/core/test/auth/SignOut.test.ts` with 42 lines, and runs `pnpm test SignOut` with 1 failing, then 3 passing.
- The one where the agent panel was closed and the Developer clicks "Agente" in the status bar.
- The one where Build lists "141 · A settings editor with search, and two scopes: project and user" with "~6 min" below it.

Questions

- Which specgate event gives the lines an edit added and the tests a run passed, so the studio need not read them from the agent's text?
````

**The values you may use** — write them exactly so; any other value goes
in `assumptions.md` or becomes a question:

`"Rama creada"` · `"intento N de M"` · `"Agente escribiendo · test primero, después el código"` · `"Gate: validate"` · `"Gate: tests"` · `"Gate: arquitectura"` · `"Aplicar · commit en su rama"` · `"Parar tras este requisito"` · `"Parar ya…"` · `"sigue el final · sube para pausar"` · `"Agente"` · `1440` · `900` · `1280` · `800` · `000` · `"Configurar agente"` · `"Rama creada ✓ 0,2 s"` · `"Agente escribiendo"` · `141` · `4,5` · `3` · `41` · `42` · `1` · `"141 · A settings editor with search, and two scopes: project and user"` · `"~6 min"`

**Questions to copy into `questions.md`**, each with the requirements it
blocks:

- Which specgate event gives the lines an edit added and the tests a run passed, so the studio need not read them from the agent's text?

## 1. The requirements — `specs/live-polish/spec.md`

Replace the placeholder with one block per requirement:

```markdown
## ADDED Requirements

### Requirement: REQ-201 — <a short name>

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL <what it does, observably>.

> Brief: "<the sentence of the brief this comes from>"

#### Scenario: SCN-601 — <what happens>

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

## 2. What the brief does not say — `assumptions.md`

Every value in a scenario that the brief does not give — a limit, a status
code, a button label — gets a row naming where it is used:

```markdown
| # | Assumption | Used in | Why | Status |
|---|---|---|---|---|
| A1 | HTTP answers: 201 created, 409 taken | REQ-201 | REST convention | to confirm |
```

## 3. What only the client can decide — `questions.md`

Prices, limits, legal, clinical or teaching rules that the brief leaves
open are **questions, not guesses**. Never invent a business rule.

```markdown
| # | Question | Blocks | Options seen | Answer | Status |
|---|---|---|---|---|---|
| Q1 | <the question, in the client's words> | REQ-201 | <what you could imagine> |  | open |
```

A requirement a question blocks carries `status="Needs Clarification"` in
its trace: nobody builds it until someone answers.

## 4. Check it, until it is ready

```bash
specgate propose --from-brief live-polish
```

Fix every finding and run it again, until it says **Ready to review**. A
`D6_unlisted_value` means a value the brief never gave: use the brief's
value, list it in `assumptions.md`, or turn it into a question.

Do not archive. A person reads the draft and answers what they can in
`questions.md`. Each requirement is then built test first and delivered with
`specgate apply REQ-NNN`; once all are applied, a person runs `specgate archive draft-live-polish`.
