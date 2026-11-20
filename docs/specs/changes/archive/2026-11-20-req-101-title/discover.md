# Discover: req-101-title

> Owner: product — what the business needs and why. No technology here: the
> design says how.

## Context

REQ-101's title names `REQ-000`. With REQ-000 removed (remove-health-baseline),
`specgate validate --strict` reads that id from the title as a requirement of
its own and fails with TDD-3: "REQ-000 found in spec.md but has no row in
traceability.md".

## Use case

1. The Developer runs `specgate check`.
2. The gate no longer reports a requirement that does not exist.

## Acceptance criteria

- AC-1: REQ-101 says the same thing, its title naming the adoption baseline in words, not by id.
- AC-2: `specgate validate --strict` reports no TDD-3 for REQ-000.
