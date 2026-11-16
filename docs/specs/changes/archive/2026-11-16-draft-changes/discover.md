# Proposal: draft-changes

## Intent

The changes module of the phase-2 brief (`docs/briefs/phase-2-specgate-flow.md`):
the studio's Changes view, where a person sees what each change waits for,
reviews a draft's requests, has it drafted again, opens a change from a ticket
and archives a finished one — each through specgate, each said before it runs.

## Scope

In scope: what the brief says about changes — the three groups, a draft's
requests and its before/after, drafting again with the open requests, a change
from a ticket reviewed and confirmed, archive only after its preview.

Out of scope: every other module of the brief; applying a requirement (the
brief's changes module does not name it — it fits build-live, or a line added
to this module), the brief's form, questions, the build.

## Approach

The view reads `specgate change list --json` and each change's files through
the host; every action is a command on the host's allow-list, echoed in the
terminal with its button, explained by its "?" and closed by a notice.
