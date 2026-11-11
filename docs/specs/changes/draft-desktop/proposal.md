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
- Installers: a .dmg for macOS (REQ-153) and an .msi for Windows (REQ-154),
  unsigned now with documented "Open anyway" and SmartScreen steps, signed in
  the owner's own name once the certificates exist — the same pipeline gains
  the signing step, and rsaglobaltech replaces the owner later (Q1, Q2); a
  signed .AppImage and .deb for Linux (REQ-155).
- Auto-update: offered on start, applied on restart, never during a build
  (REQ-156, Q3).
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
signing secrets will live there. Rust is needed to build the desktop app, not to
work on the core or the UI. While the owner arranges the signing accounts, the
macOS and Windows installers ship unsigned; the signing step runs as soon as its
secrets exist, with no other change to the pipeline (A15).
