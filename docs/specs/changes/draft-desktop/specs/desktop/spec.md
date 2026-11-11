# Delta — desktop

## ADDED Requirements

### Requirement: REQ-151 — A Tauri 2 window, the core host as a sidecar with its own Node runtime

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL install as a Tauri 2 desktop app that starts the core host as a sidecar with the Node runtime it ships, so that it opens a project on a machine where Node is not installed; the sidecar SHALL listen on 127.0.0.1 only, and SHALL end, with every process it started, when its window closes.

> Brief: "Tauri 2 shell; the core host runs as a sidecar with its own Node runtime, no Node installed needed."

#### Scenario: SCN-451 — The studio opens sprich in 0.8 s on a cold start

- GIVEN a Mac with no Node installed, the studio installed and not running, and sprich as the last project opened
- WHEN the Developer starts the studio
- THEN sprich's Home is shown and usable in 0.8 s, served by the studio's own sidecar on 127.0.0.1

#### Scenario: SCN-452 — Closing the window ends its sidecar, on Windows

- GIVEN the desktop app on Windows with sprich open and a terminal running in it
- WHEN the Developer closes sprich's window
- THEN no sidecar process and no process it started is still running

### Requirement: REQ-152 — One window per project, each over its own core host

<!-- specgate:trace actor=Developer kind=business-rule -->

The system SHALL open each project in its own window over its own core host; opening a project that is already open SHALL bring its window to the front instead of starting a second window or host.

> Brief: "Tauri 2 shell; the core host runs as a sidecar with its own Node runtime, no Node installed needed."

#### Scenario: SCN-453 — A second project opens a second window, on macOS

- GIVEN the desktop app with sprich open in one window
- WHEN the Developer opens the folder `~/mvp/specgate-studio` from the Recent list
- THEN a second window opens on specgate-studio with its own core host, and sprich's window and host are unchanged

#### Scenario: SCN-454 — Opening sprich again focuses its window, on Linux

- GIVEN the desktop app on Linux with sprich open in one window
- WHEN the Developer opens `~/mvp/sprich-platform/sprich` again
- THEN sprich's window comes to the front, and still exactly one window and one core host run for sprich

### Requirement: REQ-153 — A signed and notarized .dmg for macOS

<!-- specgate:trace status="Needs Clarification" actor=Developer kind=non-functional -->

The system SHALL ship for macOS as a .dmg whose app, sidecar included, is signed with a Developer ID certificate, built with the hardened runtime and notarized by Apple, with the notarization ticket stapled, so that Gatekeeper opens it on first launch without a warning and without a connection.

> Brief: "Signed installers for macOS (.dmg), Windows (.msi) and Linux (.AppImage, .deb), and auto-update."

#### Scenario: SCN-455 — First launch on a Mac that never saw the studio

- GIVEN a Mac with Gatekeeper on its default setting, offline, and the studio's .dmg downloaded from its release
- WHEN the Developer drags the studio to Applications and opens it
- THEN the studio opens with no "cannot be opened" or "unidentified developer" warning, and `spctl --assess --type execute` accepts the app as notarized

### Requirement: REQ-154 — A code-signed .msi for Windows

<!-- specgate:trace status="Needs Clarification" actor=Developer kind=non-functional -->

The system SHALL ship for Windows as an .msi whose installer, app and sidecar are signed with a code-signing certificate and timestamped, so that Windows names the publisher when it installs and no "unknown publisher" warning is shown.

> Brief: "Signed installers for macOS (.dmg), Windows (.msi) and Linux (.AppImage, .deb), and auto-update."

#### Scenario: SCN-456 — Installing on Windows 11

- GIVEN a Windows 11 machine with SmartScreen on, and the studio's .msi downloaded from its release
- WHEN the Developer opens the .msi
- THEN the Developer sees the installer name the studio's publisher, and no "unknown publisher" warning; and `Get-AuthenticodeSignature` reports the installer and the installed app as Valid

### Requirement: REQ-155 — An .AppImage and a .deb for Linux, signed

<!-- specgate:trace actor=Developer kind=non-functional -->

The system SHALL ship for Linux as an .AppImage and a .deb, each with a signature made with the project's published GPG key, so that a Developer can verify either before installing.

> Brief: "Signed installers for macOS (.dmg), Windows (.msi) and Linux (.AppImage, .deb), and auto-update."

#### Scenario: SCN-457 — Verifying the .deb on Ubuntu

- GIVEN Ubuntu 24.04 with the project's public GPG key imported, and the studio's .deb and its `.deb.asc` downloaded from its release
- WHEN the Developer runs `gpg --verify` on the .deb's signature and installs the .deb
- THEN gpg reports a good signature from the project's key, and the studio opens from the applications menu

#### Scenario: SCN-458 — Running the .AppImage on Fedora

- GIVEN Fedora 41 and the studio's .AppImage downloaded from its release, with its signature
- WHEN the Developer verifies it, makes it executable and opens it
- THEN the signature is good and the studio opens with no Node installed

### Requirement: REQ-156 — Auto-update, verified, and asked before it installs

<!-- specgate:trace status="Needs Clarification" actor=Developer kind=business-rule -->

The system SHALL check for a newer release when it starts, verify the update's signature before using it, and install it only after the Developer accepts — never while a build or a write command runs; its notice SHALL say which version was installed, from which, and that a restart applies it.

> Brief: "Signed installers for macOS (.dmg), Windows (.msi) and Linux (.AppImage, .deb), and auto-update."

#### Scenario: SCN-459 — An update accepted, on macOS

- GIVEN the studio 0.7.0 running on macOS, sprich open, no build running, and the release 0.7.1 published
- WHEN the Developer accepts the update the studio offers
- THEN the studio downloads 0.7.1, verifies its signature, installs it, and the notice says 0.7.1 was installed over 0.7.0 and applies on restart

#### Scenario: SCN-460 — No update during a build, on Windows

- GIVEN the studio 0.7.0 running on Windows, building REQ-030, and the release 0.7.1 published
- WHEN the Developer opens the update the studio offers
- THEN the studio says it installs once the build ends, and nothing is installed while REQ-030 builds

#### Scenario: SCN-461 — An update with a bad signature is refused, on Linux

- GIVEN the studio 0.7.0 running from its .AppImage, and a 0.7.1 whose signature does not match the studio's update key
- WHEN the studio checks for updates
- THEN nothing is installed, and the notice says the update was refused because its signature did not verify

### Requirement: REQ-157 — Idle memory under 200 MB; installer under 80 MB

<!-- specgate:trace actor=Developer kind=non-functional -->

The system SHALL use under 200 MB of memory while idle with one project open, counting the window, its webview processes and the sidecar, and SHALL ship each installer under 80 MB.

> Brief: "Idle memory under 200 MB; installer under 80 MB."

#### Scenario: SCN-462 — Memory and size measured on the desktop

- GIVEN the release build of the desktop app on macOS, Windows and Linux, sprich open and untouched for 60 s
- WHEN the Developer reads the memory of the app's processes and the size of each installer
- THEN the memory is under 200 MB on each system, and the .dmg, the .msi, the .AppImage and the .deb are each under 80 MB

#### Scenario: SCN-463 — The host idle under `specgate-studio serve`, in the browser

- GIVEN `specgate-studio serve` for sprich, one browser tab open on it, untouched for 60 s
- WHEN the Developer reads the memory of the host's process
- THEN it is under 200 MB

### Requirement: REQ-158 — The same UI in a browser with `specgate-studio serve`

<!-- specgate:trace actor=Developer kind=functional -->

The system SHALL serve, with `specgate-studio serve`, the same UI the desktop window shows, over the same core host and its JSON-RPC, so that every view and action of the desktop app works in the browser; a project open in the desktop app and served to the browser SHALL share one core host.

> Brief: "The same UI runs in a browser with `specgate-studio serve`."

#### Scenario: SCN-464 — sprich in the browser, beside the desktop app

- GIVEN the desktop app with sprich open
- WHEN the Developer runs `specgate-studio serve` in sprich's folder and opens the address it prints in the browser
- THEN the browser shows the same workbench as the desktop window, and still exactly one core host runs for sprich

#### Scenario: SCN-465 — An answer in the browser shows in the desktop window

- GIVEN sprich open in the desktop app and in the browser, its question Q2 open
- WHEN the Developer answers Q2 in the browser
- THEN the desktop window shows Q2 answered without a reload
