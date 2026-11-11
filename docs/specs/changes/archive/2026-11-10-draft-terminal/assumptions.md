# Assumptions — draft-terminal

| # | Assumption | Used in | Why | Status |
|---|---|---|---|---|
| A1 | The shell is the Developer's login shell on macOS and Linux (`$SHELL`, e.g. `zsh` on macOS, `bash` on Linux) and PowerShell on Windows (`pwsh` when installed, else Windows PowerShell); `pwd` and `Get-Location` print the folder it started in | REQ-051, REQ-052, SCN-151, SCN-152, SCN-153 | "the Developer's shell": the one their system terminal opens | confirmed |
| A2 | The terminal draws with xterm.js in the UI; the pty runs in the core host, behind a `PtyPort` with one adapter per platform runtime | REQ-051, REQ-052 | Hexagonal architecture (ADR-0001); one UI for desktop and browser | confirmed |
| A3 | A command the studio runs is echoed in the studio's own terminal, named "specgate", opened when it is first needed; the Developer's terminals are never written to | REQ-053, REQ-054, SCN-155, SCN-156, SCN-158 | Echoing into a shell's input would run it there or mix with what the Developer types | confirmed |
| A4 | The echo line reads `▶ "<button>" · <command as typed>`, and the end `exit <code>` — with "Check": `▶ "Check" · specgate check` … `exit 0` | REQ-053, SCN-155, SCN-156 | Names the button and the command, as the brief asks; the exit code comes from the host's `ended` event (REQ-005) | confirmed |
| A5 | The studio's commands run in the host with an argument array and no shell (REQ-007); their output reaches the terminal from the host's command events (REQ-005) | REQ-054, SCN-157 | Already built in core-host | confirmed |
| A6 | Typing into the studio's own terminal is ignored, and a note offers "Open a terminal" | REQ-054, SCN-158 | It shows output only; a shell is a terminal of its own | confirmed |
| A7 | Each terminal keeps at least 10,000 lines of scrollback; 1,200 lines of `npm test` fit | REQ-056, SCN-161 | xterm.js keeps 1,000 by default; a test run is often longer | confirmed |
| A8 | Terminals are named by their shell and a number (`zsh 1`, `zsh 2`) in the bottom panel; there is no limit on how many are open | REQ-055, SCN-159, SCN-160 | VS Code's convention | confirmed |
| A9 | `npm run dev`, `npm test`, `git status`, `git log`, `less spec.md`, `vim` are examples of what a Developer types; the change `add-coupons; rm -rf .` is the name used in core-host's SCN-013 | REQ-052, REQ-054, REQ-055, REQ-056 | Concrete values for the scenarios | confirmed |
| A10 | node-pty in the core host for both: the desktop app runs the same Node host as a sidecar, so one adapter serves desktop and web. No Rust pty now. | REQ-051, REQ-052 | Q1 | decided |
