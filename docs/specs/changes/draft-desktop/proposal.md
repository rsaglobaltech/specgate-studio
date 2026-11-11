# Proposal: draft-desktop

## Intent

Phase 3 of the studio: the installable desktop app. Today the studio runs only
in the browser with `specgate-studio serve`; `apps/desktop` does not exist yet.
The roadmap's phase 3 is done with signed installers for macOS, Windows and
Linux.

## Scope

In scope (docs/briefs/phase-3-proof-and-desktop.md, module desktop):

- A Tauri 2 window, the core host as a sidecar with its own Node runtime
  (REQ-151); one window per project (REQ-152).
- Signed installers: a notarized .dmg for macOS (REQ-153), a signed .msi for
  Windows (REQ-154), a signed .AppImage and .deb for Linux (REQ-155) — macOS
  and Windows waiting for Q1 and Q2.
- Auto-update, verified and asked before it installs (REQ-156) — waiting for
  Q1 and Q3.
- Idle memory under 200 MB, installers under 80 MB (REQ-157).
- The same UI in a browser with `specgate-studio serve`, over the same core
  host (REQ-158).

Out of scope:

- The Mac App Store, the Microsoft Store and Linux package repositories (apt,
  Flatpak, Snap).
- Specgate Cloud.

## Approach

`apps/desktop` holds the Tauri 2 shell and the Rust pty (ADR-0002); it wires the
host as a Node single-executable sidecar and adds no business rule (ADR-0001).
A release workflow builds and signs on macOS, Windows and Linux runners; the
signing secrets live there. Rust is needed to build the desktop app, not to work
on the core or the UI. The signing accounts are being arranged by the owner:
REQ-153, REQ-154 and REQ-156 wait for Q1 and Q2; the rest can be built first.
