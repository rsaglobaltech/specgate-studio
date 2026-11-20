# Discover: remove-health-baseline

> Owner: product — what the business needs and why. No technology here: the
> design says how.

## Context

The specification still carries the starter requirement every new specgate
project receives: "The service reports its own health" (REQ-000). It was never
rewritten for the studio. It is the only requirement left with no code, and it
asks for something the studio does not need: nobody deploys the studio and
checks it from outside. It keeps the project from reading "every requirement
delivered".

## Use case

1. The person who owns the studio reads `specgate status`.
2. The starter requirement no longer appears as work to do.

## Acceptance criteria

- AC-1: REQ-000, its row in the traceability matrix and its feature file are gone together.
- AC-2: `specgate validate --strict` passes once the change is archived.
