# Runtime Environments

> Normative contract. Specgate Studio is a local app: it has no server of its
> own and keeps no data beyond the open project's files and the user's
> settings. Code must read its configuration from the environment — never
> hardcode a host, port or credential.

| Environment | What runs | How |
|---|---|---|
| dev · web | the core host and the UI in a browser, against a local project | `npm run dev -- --project <folder>` (planned) |
| dev · desktop | the Tauri window with the host as a sidecar | `npm run tauri dev` (needs Rust, ADR-0002) |
| release | signed installers for macOS, Windows and Linux, and the npm package for `specgate-studio serve` | the release workflow (phase 3) |

Rules:

1. **No credentials in the repository.** The studio never stores an ALM or
   agent token; it reads the variables the user's environment already has.
2. **Loopback only.** In the browser, the host answers on 127.0.0.1 and refuses
   any other host name; every write carries the session token.
3. **Same behaviour on macOS, Windows and Linux**: paths, line endings, process
   trees and shells are adapter concerns (ADR-0001).
