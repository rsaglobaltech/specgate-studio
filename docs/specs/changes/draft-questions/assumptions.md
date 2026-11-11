# Assumptions — draft-questions

| # | Assumption | Used in | Why | Status |
|---|---|---|---|---|
| A1 | The example project is sprich, its draft `draft-pedidos`, whose Q1 blocks REQ-034; Q1's text is whatever its `questions.md` row says | REQ-091 … REQ-093 | The brief names Q1, REQ-034 and "50 €" but not the project or the change; sprich and `draft-pedidos` are the phase-1 examples | confirmed |
| A2 | The questions the brief leaves open, the drafts' and the agent's all come from `specgate questions --json`; the agent asks with `specgate ask <REQ> "<question>"` while it builds | REQ-091 | specgate owns its questions; the studio reads them through SpecgatePort (phase 1) | confirmed |
| A3 | Each question shows where it was asked: the brief, a draft (its change id), or the agent while it builds | REQ-091 | The brief names three sources; the Reviewer needs to tell them apart | confirmed |
| A4 | An answer is written with `specgate answer <Q> "<answer>" --change <change>`; the studio never edits `questions.md` itself | REQ-092 | specgate owns its files (phase-1 editor, help catalog) | confirmed |
| A5 | "Confirmed" means the Reviewer pressed "The spec says it", which runs `specgate answer <Q> --reviewed --change <change>` | REQ-092, REQ-093 | specgate's flow: answer, revise the requirement, then mark the answer reviewed | confirmed |
| A6 | Revising the requirement's text to say the answer is the author's work (the editor or a redraft); "The spec says it" only confirms it | REQ-093 | The studio never writes requirements itself (phase-1 REQ-045) | confirmed |
| A7 | The answer and "The spec says it" end with the help module's notice: the command, the files written, the next step | REQ-093 | Phase-1 help REQ-063 | confirmed |
| A8 | The options a question offers come from its row's "Options seen" column until `specgate questions --json` carries them | REQ-092 | Phase-1 editor; a gap in specgate | confirmed |
