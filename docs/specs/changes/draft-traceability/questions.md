# Questions — draft-traceability

What only the person who owns the studio can decide. The brief asks none for
this module; these come from drafting it.

| # | Question | Blocks | Options seen | Answer | Status |
|---|---|---|---|---|---|
| Q1 | Who writes the test that "Fix" proposes? | REQ-123 | A skeleton the studio fills from the scenario's GIVEN/WHEN/THEN in the project's test style: instant, no agent, no cost, the person writes the assertions · The project's agent writes it (`agent` in harness.config.yaml), shown as a diff before confirming: a real test, with cost and tokens · The skeleton first, and "Ask the agent" beside it |  | open |
| Q2 | Until specgate's `matrix --json` lists one row per scenario (A5), what does Traceability show? | REQ-121, REQ-122 | Wait: Traceability ships with the specgate release that adds the rows · One row per requirement from `specgate report --format json` meanwhile, saying the scenario detail comes with that release · Ask for both the rows and an API `matrix()` that returns them, and build against the CLI first |  | open |
