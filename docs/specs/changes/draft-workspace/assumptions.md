# Assumptions — draft-workspace

| # | Assumption | Used in | Why | Status |
|---|---|---|---|---|
| A1 | The three kinds read "Empty folder", "Code, no specgate project" and "Specgate project". A specgate project holds `docs/specs/traceability.md`; an empty folder holds nothing but `.git`; any other folder is code | REQ-021, SCN-061, SCN-062 | `traceability.md` is what specgate's own commands require of a project | to confirm |
| A2 | The build folders ignored are `dist`, `build`, `out`, `target`, `.next` and `coverage`, at any depth, plus the folders the project's `.gitignore` names | REQ-022, SCN-064 | The brief names no list; these are the build outputs of the stacks specgate scaffolds | to confirm |
| A3 | "Keeps up" means a saved file reaches the core host within 500 ms, with 50,000 files watched | REQ-023, SCN-065, SCN-066 | Keeps the 50 ms section answer of ADR-0002 meaningful after a save | to confirm |
| A4 | A ticket key is a Jira-style key, capital letters then a dash and a number (`SPR-42`); `pagos` and `SPR-42` are example values | REQ-024, SCN-067 | Jira keys, as specgate's ticket source uses them | to confirm |
| A5 | "Of the specification" means `spec.md`, `docs/specs/` and `features/`; every other file is grouped by its first two folders (`packages/core`, `apps/web`) | REQ-025, SCN-069, SCN-070 | The groups of the brief's example | to confirm |
| A6 | The recent projects are kept per user account of the machine, in the studio's settings folder (macOS `~/Library/Application Support/specgate-studio`, Windows `%APPDATA%\specgate-studio`, Linux `~/.config/specgate-studio`); the browser served by `specgate-studio serve` reads the same list | REQ-026 | One Developer, one machine; desktop and web share the host | to confirm |
| A7 | The folder, its files, git and the watcher are read through ports of the core (file system, git, watcher), each with a Node adapter; paths are kept with `/` and compared case-insensitively on Windows and macOS | REQ-021 … REQ-026 | ADR-0001; macOS, Windows and Linux alike | to confirm |
| A8 | `billing`, `nuevo`, `apps/web/dist` and `draft-pedidos` are example names | SCN-062, SCN-064, SCN-065, SCN-071 | Concrete scenarios | to confirm |
| A9 | Yes: one window per project on the desktop and one tab in the browser, each with its own core host; choosing a recent project that is already open brings its window forward. | REQ-026 | Q1 | decided |
