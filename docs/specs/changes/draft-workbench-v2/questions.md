# Questions — draft-workbench-v2

What only the person who owns the studio can decide. Q1 … Q3 come from the brief (`docs/briefs/workbench-v2.md`).

| # | Question | Blocks | Options seen | Answer | Status |
|---|---|---|---|---|---|
| Q1 | Which icon set do we ship, under which licence? | REQ-187 | vscode-material-icon-theme (PKief, MIT; the full set is about 1,100 SVG icons and 4 MB, the studio would ship the about 120 it maps, under 300 KB) · vscode-icons (MIT; about 1,400 icons, the same subset idea) · Seti UI (MIT, VS Code's default; a font with fewer, monochrome-by-kind glyphs, about 100 KB) · Our own set drawn in the boards' style (no licence to carry, more work) |  | open |
| Q2 | Through which specgate command does the agent run, and does it answer in JSON? | REQ-181, REQ-182, REQ-183 | A new specgate command for it — `specgate agent ask "<request>" --plan --json` returning the plan (files, diff, command, read, tokens) and `specgate agent apply <plan>` — asked of specgate first · The studio runs the project's agent (`agent` in harness.config.yaml) itself on a copy of the project, takes the diff with git, and applies it, with `specgate draft --check` after · Only drafts for now: `specgate propose --from-brief <module> --agent <agent>`, which already keeps the agent inside its draft |  | open |
| Q3 | What does Clone Repository run, and where does it clone? | REQ-185 | `git clone <url> <folder>` into a folder the Developer chooses, then opened · Into a default folder (`~/mvp/<name>`), then opened · Through `gh repo clone` when GitHub's CLI is signed in, `git clone` otherwise |  | open |
| Q4 | How many editor groups at most, and may they make a grid or only rows and columns? | REQ-188, REQ-189 | Unlimited, any grid, as VS Code · At most 4, a 2×2 grid · At most 3, in one row or one column · At most 4, rows and columns, no nested grid |  | open |
