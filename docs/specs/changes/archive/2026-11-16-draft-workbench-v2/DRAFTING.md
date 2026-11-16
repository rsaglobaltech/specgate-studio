# Drafting the workbench-v2 module

Turn **only the workbench-v2 module** of the brief into requirements and
scenarios. Nothing is built yet: this is the specification a person will
review. Specgate checks it against the brief.

The brief's `## Module: workbench-v2` section is your scope: section 0 below.

- **The brief:** `docs/briefs/workbench-v2.md` — the only source of business facts.
- **Write only inside:** `docs/specs/changes/draft-workbench-v2/`.
- **Requirement ids:** `REQ-181` … `REQ-200`: 20 ids, no others. More are needed? `specgate draft --reserve <n>` grows the range while this is the last draft opened.
- **Scenario ids:** `SCN-541` … `SCN-600`, one each, no others.

## 0. Your scope — the workbench-v2 section of the brief

This is the only text you draft from. Each **rule** becomes a requirement
(quote it under `> Brief:`), each **example** a scenario of that
requirement, each **question** a row of `questions.md`.

````markdown
## Module: workbench-v2

The frame of every view: the agent on the right, the panel at the foot, the Explorer as VS Code's.

Rules

- On the right of the workbench, the agent panel shows, before anything is written, "[ PLAN · NADA ESCRITO AÚN ]" with the files it will change and the command it will run.
- The agent's plan is applied only after "Ver el diff y aplicar" and a confirmation, "Descartar" drops it, the diff stays in Changes, and the panel says what the agent read and the tokens it used.
- The Developer and the Reviewer ask the agent from an input that reads "Pide algo sobre la spec; @ nombra un requisito o un archivo"; the agent is the project's, run through specgate.
- The bottom panel is always there with TERMINAL, GATE, PROBLEMAS, SALIDA DEL AGENTE and TRAZABILIDAD, and on its right the shell, the folder and "+".
- When no folder is open, the Explorer says "No folder opened" with "Open Folder" and "Clone Repository" and a line that explains them.
- When a folder is open, the Explorer shows the whole project under a root named after it, dot folders included, and what is ignored dimmed, never hidden, below the spec explorer and the modules.
- Each folder and file shows the icon of its kind, as an icon theme does.
- The editor splits right, left, down and up from a tab's menu, the split button in the tab strip, the palette, Ctrl/Cmd+\ and Ctrl/Cmd+K then an arrow, or by dragging a tab to an edge of a group, where an overlay shows where it lands.
- Each editor group has its own tabs; the same file may be open in two groups and stays in sync, a tab moves between groups, closing a group's last tab closes the group, Ctrl/Cmd+1, 2 or 3 focuses a group, and splitters resize the groups, a double-click evening them.
- The bottom panel can sit at the bottom, on the right or on the left and be maximized; the agent panel and the side bar can be hidden, shown and resized.
- The layout — groups, sizes, open tabs and the panel's position — is saved per project and restored when it is opened again, and a small window collapses it without losing it.
- Splitters are reached by keyboard and resized with the arrow keys, with the roles of tab lists and separators, and each split action has its "?" and its notice in English and Spanish.

Examples

- The one where the agent, asked "Que se pueda cancelar hasta 24 h antes del envío @REQ-031", plans to change changes/draft-pedidos/specs/pedidos/spec.md and run `specgate draft --check pedidos`.
- The one where sprich's node_modules shows dimmed under the root sprich.
- The one where the studio opens with no folder.
- The one where REQ-031 is open on the left and its REQ-031.feature on the right.

Questions

- Which icon set do we ship, under which licence?
- Through which specgate command does the agent run, and does it answer in JSON?
- What does Clone Repository run, and where does it clone?
- How many editor groups at most, and may they make a grid or only rows and columns?
````

**The values you may use** — write them exactly so; any other value goes
in `assumptions.md` or becomes a question:

`"[ PLAN · NADA ESCRITO AÚN ]"` · `"Ver el diff y aplicar"` · `"Descartar"` · `"Pide algo sobre la spec; @ nombra un requisito o un archivo"` · `"+"` · `"No folder opened"` · `"Open Folder"` · `"Clone Repository"` · `1` · `2` · `3` · `"?"` · `"Que se pueda cancelar hasta 24 h antes del envío @REQ-031"` · `031`

**Questions to copy into `questions.md`**, each with the requirements it
blocks:

- Which icon set do we ship, under which licence?
- Through which specgate command does the agent run, and does it answer in JSON?
- What does Clone Repository run, and where does it clone?
- How many editor groups at most, and may they make a grid or only rows and columns?

## 1. The requirements — `specs/workbench-v2/spec.md`

Replace the placeholder with one block per requirement:

```markdown
## ADDED Requirements

### Requirement: REQ-181 — <a short name>

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL <what it does, observably>.

> Brief: "<the sentence of the brief this comes from>"

#### Scenario: SCN-541 — <what happens>

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
| A1 | HTTP answers: 201 created, 409 taken | REQ-181 | REST convention | to confirm |
```

## 3. What only the client can decide — `questions.md`

Prices, limits, legal, clinical or teaching rules that the brief leaves
open are **questions, not guesses**. Never invent a business rule.

```markdown
| # | Question | Blocks | Options seen | Answer | Status |
|---|---|---|---|---|---|
| Q1 | <the question, in the client's words> | REQ-181 | <what you could imagine> |  | open |
```

A requirement a question blocks carries `status="Needs Clarification"` in
its trace: nobody builds it until someone answers.

## 4. Check it, until it is ready

```bash
specgate propose --from-brief workbench-v2
```

Fix every finding and run it again, until it says **Ready to review**. A
`D6_unlisted_value` means a value the brief never gave: use the brief's
value, list it in `assumptions.md`, or turn it into a question.

Do not archive. A person reads the draft and answers what they can in
`questions.md`. Each requirement is then built test first and delivered with
`specgate apply REQ-NNN`; once all are applied, a person runs `specgate archive draft-workbench-v2`.
