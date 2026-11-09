# Spec: Specgate Studio

## 1. Product context
Specgate Studio is an IDE for spec-driven development: a desktop app (and the same UI in a browser) that feels like VS Code and runs specgate underneath. Every feature runs a specgate command, shows it, and says what it wrote, ran, committed or pushed.

## 2. Target users
- Primary users: Developers who build with specgate and an AI agent (Claude Code, Codex).
- Secondary users: Reviewers — analysts and product owners who approve drafts and answer questions.
- Internal stakeholders: the specgate maintainers, who use the studio to build the studio.

## 3. Main objective
Take a project from a brief to proven, built requirements without leaving one fast window, and never hide what happens underneath.

## 4. In scope
- Phase 1, the foundation: core host, specgate port, workspace, workbench, editor, terminal, help (docs/brief.md).
- Phases 2 and 3: the specgate flow, proof, settings and the desktop app (docs/briefs/, docs/roadmap.md).
- Performance budgets checked in CI (ADR-0002).

## 5. Out of scope
- A general-purpose code editor: extensions, language servers for every language, debugging.
- Reimplementing specgate: the studio calls it through SpecgatePort (ADR-0003).
- Writing to Jira or Azure Boards beyond what specgate itself does.

## 6. Success criteria
- Cold start: window visible in under 300 ms, interactive in under 1 s; idle memory under 200 MB.
- After the first read, any section answers in under 50 ms.
- Every action has a "?" explanation in Spanish and English, enforced by a test.
- Every requirement is proven by a test that names it; `specgate check` is green on main.

## 7. Initial bounded contexts
- Core Domain: the project's specification state and the use cases over it (packages/core).
- Supporting Domain: specgate, git, the file system, the terminal and the agent, each behind a port.
- Generic Domain: the window, settings storage, i18n.

## 8. Key requirements

<!--
  Add requirements with `specgate req add "<what the requirement does>"`, which
  writes the row here **and** in docs/specs/traceability.md at the same time.

  Do not hand-write a row here alone. A requirement that exists in this file and
  not in the matrix fails `specgate validate --strict-tdd` with [TDD-3], and the
  table below is the one a generated project used to ship pre-filled with an
  example — so every new project was born with a red gate (H20).
-->

| ID | Requirement | Priority | Status |
|---|---|---|---|
| REQ-000 | The service reports its own health | Must | Draft |

### REQ-000 — The service reports its own health

<!-- specgate:trace artifact='API /health, smoke test' uc='UC-000 Health baseline' cmd='QRY-000 HealthCheckQuery' -->

The system MUST expose a health endpoint that answers with status 200 and a
payload naming the service as `UP`, so that a deployment can be checked without
reading logs.

> The starter requirement, wired end to end: this prose, the row in
> `docs/specs/traceability.md`, and `features/core/health.feature`. Rewrite it
> for your own first requirement, or remove all three together —
> `specgate validate --strict` reports any of them going missing on its own.

## 9. Non-functional requirements
| ID | Requirement | Quality attribute | Status |
|---|---|---|---|
| NFR-001 | Define the first measurable non-functional requirement. | Reliability | Draft |

## 10. Risks and open questions
| ID | Topic | Impact | Owner | Status |
|---|---|---|---|---|
| RISK-001 | Capture the first domain, delivery, or architecture risk. | Medium | TBD | Draft |

## 11. Domain language
| Term | Meaning | Notes |
|---|---|---|
| Example term | Define the term using business language. | Replace with project language. |
