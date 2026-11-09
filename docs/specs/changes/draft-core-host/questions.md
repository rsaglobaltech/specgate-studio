# Questions — draft-core-host

What only the person who owns the studio can decide.

| # | Question | Blocks | Options seen | Answer | Status |
|---|---|---|---|---|---|
| Q1 | Is the transport WebSocket for both desktop and web, or stdio for the desktop sidecar? | REQ-001 | WebSocket on 127.0.0.1 for both (one code path, the desktop sidecar listens like the web host) · stdio for the desktop sidecar and WebSocket for the web (no open port on the desktop, two transports) | WebSocket on 127.0.0.1 for both: the desktop sidecar listens like the web host, one transport | reviewed |
