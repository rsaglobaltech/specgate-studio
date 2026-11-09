# ADR-0002 — Tauri 2 for the window, TypeScript for everything else

Status: accepted · 2026-11-09

## Context

The studio must feel like VS Code and be faster than it, install as a desktop
app on macOS, Windows and Linux, and also run in a browser.

Measured on the first studio: its UI is 144 KB of JavaScript and 31 KB of CSS;
`specgate change list` takes 0.2 s and `specgate status` 1.9 s per spawned
process. The slowness people feel comes from spawning processes and re-reading
the project, not from the UI language. VS Code's own weight comes from
Electron (a full Chromium and Node per app), its extension host and language
servers; forks like Kiro and Cursor inherit it.

## Decision

- **Window: Tauri 2.** The system webview (WebView2 on Windows, WKWebView on
  macOS, WebKitGTK on Linux) and a small Rust core: installers of a few MB for
  the shell and roughly half the memory of Electron.
- **UI: TypeScript, Preact, Monaco (lazy-loaded), xterm.js.** The same bundle in
  the desktop window and in the browser.
- **Core and host: TypeScript on Node 22**, shipped inside the app as a sidecar
  (Node single executable), so no Node needs to be installed.
- **Terminal: a Rust pty** in the desktop app, node-pty in the web host, behind
  `TerminalPort`.
- **Budgets, checked in CI:** window visible < 300 ms, interactive < 1 s, view
  switch < 50 ms, a section's data < 50 ms after the first read, idle memory
  < 200 MB, installer < 80 MB.

## Consequences

- Rust is needed to build the desktop app (rustup), not to work on the core or UI.
- WebKitGTK on Linux is the slowest webview; if it breaks the budgets, the
  window moves to Electron. The UI, protocol and core do not change (ADR-0001).
- Monaco is the editor VS Code uses; if it breaks the startup budget,
  CodeMirror 6 replaces it behind the editor component.
