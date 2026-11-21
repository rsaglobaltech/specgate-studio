# Discover: brief-paste-progress

> Owner: product — what the business needs and why. No technology here: the
> design says how.

## Context

Importing a client's letter takes the agent a minute or more. Meanwhile the
Developer could still edit the pasted text — which no longer changes what the
agent reads — and saw a single line, with nothing telling what was running or
for how long. When it failed, the reason was only in the terminal.

## Use case

1. The Developer pastes the client's text and presses "Propose the form".
2. The text locks; the dialog shows the steps: the text kept aside, the agent
   proposing (with the time so far and the command), the form to review.
3. Done: the proposed form is shown to review. Refused: the step shows why
   and how to fix it, and the text can be changed again.

## Acceptance criteria

- AC-1: the text cannot be edited while the agent works, and the dialog does not close by accident.
- AC-2: the dialog shows each step, which one is under way, its time and the command.
- AC-3: a refusal shows in the dialog, with its fix, and unlocks the text.
