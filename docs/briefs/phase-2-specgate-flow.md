---
product: Specgate Studio — the specgate flow
surfaces: [desktop, web]
actors:
  - { name: Developer, surfaces: [desktop, web] }
  - { name: Reviewer, surfaces: [desktop, web] }
modules: [brief, changes, questions, build-live, project-setup]
---

# Specgate Studio — phase 2: the specgate flow

From an empty folder to a built requirement inside the studio. Drafted once phase 1 is archived: copy this file to docs/brief.md then.

## Module: brief

Rules

- The brief is edited as a form and as markdown; both write `docs/brief.md` and keep every line that is not theirs.
- The brief's checks run on every save and show in Problems.
- "Draft the modules" runs `propose --from-brief <module>` with the agent, one module at a time.
- Pasting the client's text lets the agent propose the form; nothing is saved until the person accepts.

Examples

- The one where "free above some amount" is flagged as a vague value.

Questions

- None.

## Module: changes

Rules

- Changes are grouped: to review, in progress, ready to archive.
- A draft shows its requests for change as open or addressed, and each requirement before and after a redraft.
- "Draft again with N requested changes" hands the open notes to the agent.
- A change from a ticket is reviewed first, opened on the ticket's branch, and its commit and push are said and confirmed.
- Archive runs only after its preview.
- Apply runs the gate for one requirement and, when it refuses, says why and the fix.

Examples

- The one where KAN-13 is opened on `feature/parking/KAN-13` with `--no-branch --no-push`.
- The one where Apply on REQ-031 is refused with `apply_no_test` and its fix.

Questions

- None.

## Module: questions

Rules

- Open questions from the brief, the drafts and the agent while it builds, each with the requirements it blocks.
- An answer is written to its row of `questions.md`; "The spec says it" marks it reviewed and lifts Needs Clarification.

Examples

- The one where Q1 is answered "50 €" and REQ-034 stays blocked until confirmed.

Questions

- None.

## Module: build-live

Rules

- Build lists what is ready, its estimate, and who codes.
- With uncommitted work that is not the specification, Build explains why it waits and offers commit, stash or ignore, each confirmed.
- Live shows each requirement's steps with their time, the agent's output as it streams, the queue, cost and tokens.
- The agent's question is answered inside Live.
- Stop after this requirement, or stop now after a confirmation; stopping ends every process the agent started.

Examples

- The one where sprich's 325 files are grouped and committed with the person's message.

Questions

- None.

## Module: project-setup

Rules

- An empty folder offers five questions and creates the project with `specgate init`.
- A folder with code is adopted in place with `specgate adopt`, after showing what it writes.

Examples

- The one where "academia" is created as a web app in Node.js and React with Claude Code.

Questions

- None.
