# Discover: brief-keep-client-text

> Owner: product — what the business needs and why. No technology here: the
> design says how.

## Context

A Developer imported a client's 20-page specification. The agent proposed
the brief's front matter from it and the Developer accepted it — but the
text itself never reached the brief. With an empty brief, nothing could be
drafted: no requirements, no scenarios.

## Use case

1. The Developer pastes the client's text and the agent proposes the form.
2. The Developer accepts: the brief now holds the front matter and the
   client's text below it.
3. "Draft the modules" drafts each module from that text.

## Acceptance criteria

- AC-1: after Accept, the brief holds the client's text.
- AC-2: a brief that had a body keeps it; the client's text follows it.
- AC-3: the same text accepted again is not written twice.
