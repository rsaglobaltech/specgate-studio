# Delta — terminal

## ADDED Requirements

### Requirement: REQ-051 — A terminal in the project's folder, with the Developer's shell

<!-- specgate:trace status="Needs Clarification" actor=Developer kind=functional -->

The system SHALL open each terminal as a pseudo-terminal (pty) that runs the Developer's own shell, started in the folder of the open project, so that what the Developer types runs exactly as in their system terminal.

> Brief: "A pty in the project's folder, with the Developer's shell, on macOS, Windows and Linux."

#### Scenario: SCN-151 — A new terminal on the desktop starts in sprich

- GIVEN sprich open in the desktop app on macOS, where the Developer's shell is `zsh`
- WHEN the Developer opens a new terminal in the bottom panel and types `pwd`
- THEN the Developer sees the prompt of their `zsh`, and `pwd` prints the folder of sprich

#### Scenario: SCN-152 — A new terminal in the browser starts in sprich

- GIVEN sprich open in the browser with `specgate-studio serve` on Linux, where the Developer's shell is `bash`
- WHEN the Developer opens a new terminal in the bottom panel and types `pwd`
- THEN the Developer sees the prompt of their `bash`, and `pwd` prints the folder of sprich

### Requirement: REQ-052 — The same terminal on macOS, Windows and Linux

<!-- specgate:trace status="Needs Clarification" actor=Developer kind=functional -->

The system SHALL offer the terminal on macOS, Windows and Linux alike: the shell is the Developer's login shell on macOS and Linux and PowerShell on Windows, and a full-screen program such as `vim` or `less` draws and takes keys as it does in the system terminal.

> Brief: "A pty in the project's folder, with the Developer's shell, on macOS, Windows and Linux."

#### Scenario: SCN-153 — PowerShell on the Windows desktop

- GIVEN sprich open in the desktop app on Windows
- WHEN the Developer opens a new terminal and types `Get-Location`
- THEN the Developer sees a PowerShell prompt, and `Get-Location` prints the folder of sprich

#### Scenario: SCN-154 — A full-screen program in the browser

- GIVEN sprich open in the browser on macOS, with a terminal open
- WHEN the Developer types `less spec.md`, then `q`
- THEN the Developer sees `spec.md` paged over the whole terminal, and after `q` the prompt again with the earlier lines in place

### Requirement: REQ-053 — A command the studio runs is echoed with the button that started it

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL echo every command the studio runs in the terminal: a line that names the button that started it and the command as the Developer would type it, then the command's output as it is written, then how it ended, with its exit code.

> Brief: "When the studio runs a command, it is echoed in the terminal with the button that started it."

#### Scenario: SCN-155 — "Check" prints `specgate check` and its stages on the desktop

- GIVEN sprich open in the desktop app, its terminal panel closed
- WHEN the Developer presses "Check"
- THEN the Developer sees the terminal open with the line `▶ "Check" · specgate check`, then each stage of `specgate check` as it runs, then `exit 0`

#### Scenario: SCN-156 — "Check" pressed in the browser, while a terminal is busy

- GIVEN sprich open in the browser, its terminal running `npm run dev`
- WHEN the Developer presses "Check"
- THEN the Developer sees `▶ "Check" · specgate check` and its stages in the studio's own terminal, and `npm run dev` keeps running in the other terminal, its output untouched

### Requirement: REQ-054 — What the studio echoes is shown, never typed into the Developer's shell

<!-- specgate:trace actor=Developer kind=business-rule -->

The system SHALL run a command the studio starts through the host, with its arguments as an array and no shell, and only show it in the terminal: nothing the studio echoes is written to the input of a Developer's shell, and the Developer cannot type into the studio's own terminal.

> Brief: "When the studio runs a command, it is echoed in the terminal with the button that started it."

#### Scenario: SCN-157 — A change name with a semicolon, on the desktop

- GIVEN sprich open in the desktop app, with the change `add-coupons; rm -rf .` listed
- WHEN the Developer presses "Check" on that change
- THEN the Developer sees the echo name `add-coupons; rm -rf .` as one argument, no shell runs `rm`, and every file of sprich is still there

#### Scenario: SCN-158 — Typing into the studio's terminal in the browser

- GIVEN sprich open in the browser, the studio's own terminal showing the end of `specgate check`
- WHEN the Developer types `ls` and Enter into that terminal
- THEN the Developer sees nothing typed and nothing run there, and a note that commands are typed in a terminal of their own, with the button that opens one

### Requirement: REQ-055 — Several terminals at once

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL let the Developer open several terminals at once, each its own pty and shell, listed by name in the bottom panel, each closable without closing the others.

> Brief: "Several terminals at once; each keeps its scrollback."

#### Scenario: SCN-159 — Two terminals running at once on the desktop

- GIVEN sprich open in the desktop app, a terminal running `npm test`
- WHEN the Developer opens a second terminal and types `git status`
- THEN the Developer sees both terminals listed in the bottom panel, `git status` answered in the second while `npm test` keeps running in the first

#### Scenario: SCN-160 — Closing one terminal in the browser

- GIVEN sprich open in the browser with three terminals open
- WHEN the Developer closes the second one
- THEN the Developer sees two terminals listed, the first and the third with their shells still running and their output in place

### Requirement: REQ-056 — Each terminal keeps its scrollback

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL keep each terminal's scrollback while the Developer switches between terminals, views and editor tabs, and while the bottom panel is hidden; a terminal's output is never mixed into another's.

> Brief: "Several terminals at once; each keeps its scrollback."

#### Scenario: SCN-161 — Back to a terminal after another view, on the desktop

- GIVEN sprich open in the desktop app, a terminal that printed the 1,200 lines of `npm test`
- WHEN the Developer opens Changes, hides the bottom panel, then shows it and scrolls that terminal up
- THEN the Developer sees all 1,200 lines of `npm test`, in order

#### Scenario: SCN-162 — Switching between two terminals in the browser

- GIVEN sprich open in the browser, one terminal that ran `git log` and another that ran `npm test`
- WHEN the Developer switches from the second terminal to the first
- THEN the Developer sees the `git log` output where it was, with none of `npm test` in it
