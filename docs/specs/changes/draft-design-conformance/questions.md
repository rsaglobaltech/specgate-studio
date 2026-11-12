# Questions — draft-design-conformance

What only the person who owns the studio can decide. The three come from the
brief (`docs/briefs/design-conformance.md`): the boards show the agent panel
and the menu bar but say nothing of how far they go, and no board draws the
Help view.

| # | Question | Blocks | Options seen | Answer | Status |
|---|---|---|---|---|---|
| Q1 | Is the agent panel of the shell board part of this change, a draft of its own, or left out? | REQ-172 | A draft of its own (the request, the plan "nothing written yet", the diff to apply or discard, what it read, the prompt), after this one; this change leaves room for it · Part of this change · Left out: the agent stays in the terminal and Agent output | Its own draft later; out of this change. | reviewed |
| Q2 | Is the menu bar the operating system's menu on the desktop app, a bar in the page on both, or left to the palette? | REQ-172 | The operating system's menu on the desktop app (macOS's top bar, the window's menu on Windows and Linux) and a bar in the page in the browser · A bar in the page on both, as the board draws it · No menu bar: the palette and the activity bar only | The operating system's menu on the desktop app, and a bar in the page in the browser. | reviewed |
| Q3 | What does the Help view show, since no board draws it? | REQ-172 | Every view and feature with its "?" explanation, searchable · A short guide of the route (brief → drafts → questions → build → report) with links to the views · No Help view: the activity bar's "?" opens the palette filtered to explanations | A searchable catalogue of the "?" explanations, in English and Spanish. | reviewed |
