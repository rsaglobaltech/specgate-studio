# Questions — draft-editor

What only the person who owns the studio can decide.

| # | Question | Blocks | Options seen | Answer | Status |
|---|---|---|---|---|---|
| Q1 | CodeMirror 6 instead of Monaco if Monaco breaks the startup budget? | REQ-041 | Monaco, loaded only when the first file opens, so the window's budget (visible < 300 ms, interactive < 1 s, ADR-0002) never pays for it; switch to CodeMirror 6 only if opening the first file takes longer than a limit the person sets, measured on sprich (recommended) · CodeMirror 6 from the start (smaller, but fewer VS Code features: no built-in diff editor, minimap or VS Code keymap) |  | open |
