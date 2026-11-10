# Questions — draft-terminal

| # | Question | Blocks | Options seen | Answer | Status |
|---|---|---|---|---|---|
| Q1 | Is the pty in Rust (Tauri) and in node-pty for the web host? | REQ-051, REQ-052 | (a) node-pty in the core host for both — the desktop app runs the same Node host as a sidecar over a WebSocket (core-host Q1), so one adapter serves both; (b) a Rust pty (portable-pty) in Tauri for the desktop and node-pty for the web host — two adapters behind one `PtyPort`, and Rust is needed on every build machine. Recommended: (a) now; (b) only if phase 3 drops the Node sidecar | node-pty in the core host for both: the desktop app runs the same Node host as a sidecar, so one adapter serves desktop and web. No Rust pty now. | reviewed |
