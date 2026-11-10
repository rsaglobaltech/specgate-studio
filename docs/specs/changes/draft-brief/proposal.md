# Proposal: draft-brief

## Intent

The brief module of the phase-2 brief (`docs/briefs/phase-2-specgate-flow.md`),
written down as requirements and scenarios a person can review before anything
is built: the brief edited as a form and as markdown in one file, its checks on
every save in Problems, "Draft the modules" drafting one module at a time with
the agent, and the client's text turned into a proposed form that is written
only when accepted.

## Scope

In scope: what the brief says about the brief module (REQ-071 … REQ-074).

Out of scope: every other module of the phase-2 brief. Reviewing and approving
the drafts is changes; answering their questions is questions; the agent's run
itself is build-live.

## Approach

The Brief view replaces the workbench's placeholder. The form and Monaco edit
the same `docs/brief.md` through the host's file save (draft-editor REQ-045),
the form owning only its fields (A2). Every save runs specgate's brief check
and its findings reach Problems and the editor's underlines (A3). Drafting and
proposing run specgate with the project's agent through the host's commands —
argument arrays, one write at a time — echoed in the terminal with their button
and explained by help's catalog (A6, A9, A11).
