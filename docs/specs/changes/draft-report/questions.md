# Questions — draft-report

What only the person who owns the studio can decide. The brief asks none for
this module; these come from drafting it.

| # | Question | Blocks | Options seen | Answer | Status |
|---|---|---|---|---|---|
| Q1 | Which coverage does the report show for the client? | REQ-131 | The diff coverage of what the harness delivered, mean per requirement, as `specgate harness report` measures it today · The line coverage of the whole project from the last test run (needs a coverage check in harness.config.yaml, and a specgate field for it) · Both, labelled |  | open |
| Q2 | Which cost does the report show? | REQ-131 | specgate's estimated spend, declared per agent profile and labelled "estimated" (`estimatedCost` in `harness report --json`) · The cost measured from the agent's tokens, as Live shows it during a build (needs specgate to total it in `harness report --json`) · Both, the measured one when it exists |  | open |
