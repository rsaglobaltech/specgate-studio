# Discover: agent-placeholder

> Owner: product — what the business needs and why. No technology here: the
> design says how.

## Context

The agent's input suggests a first question. It always read "What is
missing to approve pedidos?" — the module of the demo project — so in any
real project it named a module that does not exist there.

## Use case

1. A Reviewer opens a project with one draft open and sees, in the agent's
   input, the question about that draft's module.
2. A Developer opens a project with no draft, or several, and sees a plain
   invitation to ask about the spec.

## Acceptance criteria

- AC-1: with exactly one draft open, the suggestion names its module.
- AC-2: with none or several, the suggestion names no module.
- AC-3: the suggestion is never a module the project does not have.
