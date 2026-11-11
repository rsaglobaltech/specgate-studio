# Proposal: draft-help

## Intent

The help module of the brief (`docs/brief.md`): the studio says what
everything does. Every feature that writes, runs, commits, pushes or sends has
a "?" that explains it before it is used; every action ends with a notice that
says what it wrote or ran and what comes next, never only "done"; and every
explanation exists in English and Spanish, or the tests fail.

It answers a problem seen in specgate's old studio: "Ask for a change" showed
"done" while the draft stayed the same — the request had gone to `review.md`,
and nothing said that the draft changes only when it is drafted again.

## Scope

In scope: REQ-061 … REQ-065.

Out of scope: every other module of the brief; the actions themselves (Check,
Build, Apply, Archive, Ask for a change belong to their modules and phase 2) —
this module gives each one its explanation and its notice.

## Approach

The explanations and notices are data: a catalog in the core keyed by action
and language, rendered by the UI's "?" and notices. A test walks every action
the protocol offers and fails when one lacks either language (A3).
