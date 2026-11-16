# Assumptions — draft-changes

What the brief does not say, chosen so the scenarios can be tested. Each is to
confirm by the person reviewing the draft.

| # | Assumption | Used in | Why | Status |
|---|---|---|---|---|
| A1 | The example project is sprich, with the draft `draft-pedidos` (module `pedidos`) and REQ-031, as in phase 1; `add-coupons` and `fix-rounding` are example changes | REQ-081 … REQ-085 | Values phase 1's drafts already use | confirmed |
| A2 | A change's group: "To review" — a draft not yet approved; "In progress" — approved, some requirement not yet applied; "Ready to archive" — every requirement applied. The group titles carry their count: "To review (1)", "In progress (1)", "Ready to archive (1)" | REQ-081, SCN-241 | What each group the brief names means is not in it | confirmed |
| A3 | A request for change is a row of the draft's `review.md`, written by Ask for a change (`specgate change note`); it is addressed once a redraft marks it so, open otherwise | REQ-082, REQ-083 | specgate's own review file (help REQ-062, REQ-064) | confirmed |
| A4 | "Before and after a redraft" compares a requirement's text in the last reviewed version with the current one, side by side, changed words marked | REQ-082 | A diff the Reviewer can read at a glance | confirmed |
| A5 | "Draft again" runs `specgate propose --from-brief <module>` with the configured agent, the open requests in its prompt; N is the number of open requests ("Draft again with 2 requested changes"); with none open the action is not offered | REQ-083 | The brief names the action and the open notes, not the command or the empty case | confirmed |
| A6 | A change from a ticket: the review comes from `specgate propose --from-ticket <KEY> --check`; on the ticket's branch already the change opens with `--no-branch`; "Don't push yet" adds `--no-push`; nothing runs, branches or commits before the confirmation | REQ-084 | specgate's ticket flow; the brief's example names both flags | confirmed |
| A7 | KAN-13 is read from Jira with the project's ALM configured; its branch is `feature/parking/KAN-13` | REQ-084 | The brief's example | confirmed |
| A8 | Archive's preview is `specgate archive <change> --dry-run`; a change with a requirement not yet applied offers no Archive and names that requirement; the archive's notice comes from the help module | REQ-085 | specgate refuses such an archive (`archive_requirements_pending`); help owns notices | confirmed |
| A9 | Every command a button runs is echoed in the terminal with its button (terminal REQ-053) and is on the host's command allow-list (specgate-port REQ-016), with its "?" in English and Spanish (help REQ-061, REQ-065) | REQ-081 … REQ-085 | Phase 1's rules apply to every new action | confirmed |
