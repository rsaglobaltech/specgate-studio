# The desktop app

Specgate Studio installs as a desktop app on macOS, Windows and Linux
(draft-desktop, REQ-151 … REQ-158). It is a Tauri 2 window over the same core
host and the same UI that `specgate-studio serve` gives a browser (ADR-0001,
ADR-0002).

- **One window per project.** Each window runs its project's core host as a
  _sidecar_: the Node 22 the app ships (no Node needs to be installed) running
  the bundled host, on `127.0.0.1` only. Opening a project that is already open
  brings its window to the front.
- **Closing a window ends its sidecar and everything it started** — a
  terminal's shell, a build, the agent: the sidecar runs in a process group of
  its own on macOS and Linux, and in a Job object on Windows. If the window
  itself dies, the sidecar sees its input close and ends too.
- **One host per project, shared with the browser.** A running host leaves a
  lock in the studio's settings folder (`hosts/<hash>.json`, beside
  `recent-projects.json`). `specgate-studio serve` in a folder the desktop app
  has open prints that host's address instead of starting a second host; a
  window opened on a folder that `serve` already serves joins it. An answer
  given in one shows in the other without a reload.
- **Menus.** File → Open Folder… (⌘O / Ctrl+O) and Open Recent. Started with
  no folder, the app opens the most recent project, or asks for a folder.

## Install

Releases are on [GitHub Releases](https://github.com/rsaglobaltech/specgate-studio/releases)
under the tags `desktop-v*`:

| System | File | Signed |
|---|---|---|
| macOS, Apple silicon | `Specgate.Studio_<version>_aarch64.dmg` | not yet: ad-hoc only — see Open anyway |
| macOS, Intel | `Specgate.Studio_<version>_x64.dmg` | not yet: ad-hoc only — see Open anyway |
| Windows | `Specgate.Studio_<version>_x64_en-US.msi` | not yet — see SmartScreen |
| Linux | `Specgate.Studio_<version>_amd64.AppImage`, `Specgate.Studio_<version>_amd64.deb` | a `.asc` GPG signature each, once the project's key is set |

Until the certificates exist the installers are unsigned, and each system
warns the first time. The steps below get past the warning; each release's
notes say which platforms are signed and link here.

### macOS: Open anyway

Drag **Specgate Studio** from the .dmg to **Applications**, then:

1. Open it once. macOS says it cannot verify the developer; choose **Done**
   (on macOS 14 and earlier: **Cancel**).
2. On **macOS 15 and later**: open **System Settings → Privacy & Security**,
   scroll to _"Specgate Studio" was blocked to protect your Mac_, click
   **Open Anyway**, confirm with your password or Touch ID, and choose
   **Open Anyway** again.
   On **macOS 14 and earlier**: Control-click the app in Applications, choose
   **Open**, then **Open** in the dialog.
3. From then on it opens normally.

If macOS says the app **"is damaged and can't be opened"** — what a browser's
quarantine flag on an unsigned app can lead to — remove the flag and open it
again:

```bash
xattr -dr com.apple.quarantine "/Applications/Specgate Studio.app"
```

### Windows: SmartScreen

Run the .msi. While it is unsigned:

1. If the browser says the file _isn't commonly downloaded_: **⋯ → Keep →
   Show more → Keep anyway** (Edge).
2. SmartScreen shows **"Windows protected your PC"**: click **More info**, then
   **Run anyway**.
3. The installer names an unknown publisher; continue. The studio is in the
   Start menu.

The app uses Microsoft Edge WebView2, which Windows 10 and 11 already have; the
installer fetches it if it is missing.

### Linux: verify

Import the project's public release key once (published with the releases as
`specgate-studio-release.asc` once it exists), then verify before installing:

```bash
gpg --import specgate-studio-release.asc
gpg --verify "Specgate.Studio_<version>_amd64.deb.asc" "Specgate.Studio_<version>_amd64.deb"
sudo apt install "./Specgate.Studio_<version>_amd64.deb"

gpg --verify "Specgate.Studio_<version>_amd64.AppImage.asc" "Specgate.Studio_<version>_amd64.AppImage"
chmod +x "Specgate.Studio_<version>_amd64.AppImage"
"./Specgate.Studio_<version>_amd64.AppImage"
```

`gpg` must say **Good signature** from the project's key. The AppImage needs
FUSE 2 (`sudo apt install libfuse2` on Ubuntu 22.04 and later; Fedora has it).

## Updates

When the studio starts it checks the latest release. A newer one is
**offered**; it is **installed only if you accept**, and **applies when the
studio restarts**. While a build or a write command runs in any open project,
it waits and says so — the rule is core's (`updateStep`), the shell asks each
host. Declined, it is offered again on the next start.

Each update is signed with the updater's own key (separate from the Apple and
Windows certificates) and verified before it is used: one whose signature does
not verify is refused, and nothing is installed. An update the app downloads
itself carries no quarantine flag, so macOS shows no Open anyway step for it.
On Windows the downloaded installer runs as the studio quits. The `.deb` is
updated by installing the new `.deb`.

Until the owner sets the updater's public key (below), the app does not check
for updates.

## Build it locally

Rust is needed for the desktop app only ([rustup](https://rustup.rs)); the core
and the UI need Node 22 alone. macOS needs Xcode's command-line tools; Linux
needs `libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev patchelf`;
Windows needs the MSVC build tools.

```bash
npm ci
npm run build                                   # core, host, UI and the sidecar's sources
cd apps/desktop
npx tauri build --target x86_64-apple-darwin    # or aarch64-apple-darwin, x86_64-pc-windows-msvc, x86_64-unknown-linux-gnu
```

`tauri build` first runs `scripts/bundle-sidecar.mjs`: it downloads Node
22.23.5 for the target from nodejs.org (its SHA-256 checked against the value
in the script), bundles the host with esbuild, copies the UI, and installs
node-pty's native module for the target. Local builds are ad-hoc signed and
unsigned for updates; nothing is signed with a real certificate on a
developer's machine.

The Rust shell's tests: `cd apps/desktop/src-tauri && cargo test`.

### Measure the budgets

Each installer under 80 MB and the app idle under 200 MB (REQ-157):

```bash
cd apps/desktop
node scripts/measure.mjs --sizes --target x86_64-apple-darwin
node scripts/measure.mjs --memory --project <a scratch project> --idle 60 --target x86_64-apple-darwin
```

`--memory` starts the release build on the folder, waits, adds up the resident
memory of the app, its webview's processes and the sidecar with its children,
quits the app and checks no sidecar is left. Use a scratch project made with
`npx specgate init` in a temporary folder, never a real repository.

Measured on an Intel Mac, macOS 26, release build 0.1.0 (x64), on a scratch
project made by `specgate init`, 2026-11-11:

| What | Measured | Budget |
|---|---|---|
| `Specgate Studio_0.1.0_x64.dmg` | 47.6 MB (45.4 MiB) | < 80 MB |
| `Specgate Studio_0.1.0_aarch64.dmg` (cross-built on the same Mac, not run) | 45.5 MB (43.4 MiB) | < 80 MB |
| The .app it holds, uncompressed | 150 MB (143 MiB; the Node runtime is 112 MiB of it) | — |
| Idle memory, one project, 60 s — first launch after the build | 363.6 MB resident (the webview's content process alone 170.6 MB) | < 200 MB: **over** |
| Idle memory, one project, 60 s — later launches | 198.4 MB and 192.2 MB resident (`footprint`: about 105 MB) | < 200 MB: at the limit |
| The sidecar's host alone, idle (`npm test`, SCN-463) | 59 MB resident | < 200 MB |
| Cold start: the host answering / the page connected to it | 0.75 s / 1.29 s (first launch after the build: 6.1 s, macOS checking the new binaries) | 0.8 s for Home usable: **not met** on this machine |

Resident memory counts pages shared between processes once per process, so
the sum overstates what the app takes; `footprint` is closer to it. The
webview's share varies most. The budget is not reliably met yet; the numbers
are here so the next change can be measured against them.

## Release

1. Set `version` in `apps/desktop/package.json` (Tauri reads it) and merge.
2. Tag the merge `desktop-v<version>` and push the tag — or run **Desktop
   release** by hand with that tag.
3. `.github/workflows/desktop-release.yml` builds on macOS (arm64 and x64),
   Windows and Linux runners, signs what its secrets allow, checks each
   installer's size, and attaches everything to a **draft** release whose notes
   say what is signed and link the steps above.
4. A person reads the draft and publishes it. Installed studios find it through
   `latest.json` once it is published.

### The secrets to add

Every secret lives in the repository's **Settings → Secrets and variables →
Actions**; each signing step runs only once its secrets exist and is skipped,
saying so in the release notes, until then. The commands below are for the
owner to run on their own machine; `gh secret set` asks for the value when none
is piped in.

**Updates** — the updater's own key, free:

```bash
cd apps/desktop
npx tauri signer generate -w ~/.tauri/specgate-studio-updater.key   # asks for a password
gh secret set TAURI_SIGNING_PRIVATE_KEY < ~/.tauri/specgate-studio-updater.key
gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD                   # that password
cat ~/.tauri/specgate-studio-updater.key.pub                       # the public key
```

| Secret | What |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | the private key file's content |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | its password |

Then put the **public** key in `apps/desktop/src-tauri/tauri.conf.json`, in
`plugins.updater.pubkey` in place of `REPLACE_WITH_TAURI_UPDATER_PUBLIC_KEY`, and
commit it: it is public, and the app verifies every update with it. Keep the
private key backed up: without it, installed studios can never be updated
again. The workflow refuses to build updates while the placeholder is there.

**macOS** — an Apple Developer Program membership in the owner's own name
(individual), a **Developer ID Application** certificate, and an App Store
Connect API key for notarization:

```bash
# The certificate, exported from Keychain Access as a .p12 with a password:
base64 -i DeveloperIDApplication.p12 | gh secret set APPLE_CERTIFICATE
gh secret set APPLE_CERTIFICATE_PASSWORD
security find-identity -v -p codesigning        # copy "Developer ID Application: <Name> (<TEAMID>)"
gh secret set APPLE_SIGNING_IDENTITY
# App Store Connect → Users and Access → Integrations → Keys: a key with the Developer role.
gh secret set APPLE_API_KEY                      # its Key ID
gh secret set APPLE_API_ISSUER                   # the Issuer ID
gh secret set APPLE_API_PRIVATE_KEY < AuthKey_<KEYID>.p8
```

| Secret | What |
|---|---|
| `APPLE_CERTIFICATE` | the Developer ID Application certificate and key, .p12 in base64 |
| `APPLE_CERTIFICATE_PASSWORD` | the .p12's password |
| `APPLE_SIGNING_IDENTITY` | `Developer ID Application: <Name> (<TEAMID>)` |
| `APPLE_API_KEY` | the App Store Connect API key's ID |
| `APPLE_API_ISSUER` | its issuer ID |
| `APPLE_API_PRIVATE_KEY` | the `AuthKey_<KEYID>.p8` file's content |

With them, the workflow signs the app, the sidecar and its native files with
the hardened runtime (`src-tauri/entitlements.plist`: Node's JIT and node-pty's
native module), notarizes and staples it, and checks it with
`spctl --assess --type execute`.

**Windows** — a code-signing certificate in the owner's own name:

```bash
base64 -w0 certificate.pfx | gh secret set WINDOWS_CERTIFICATE     # PowerShell: [Convert]::ToBase64String([IO.File]::ReadAllBytes("certificate.pfx")) | gh secret set WINDOWS_CERTIFICATE
gh secret set WINDOWS_CERTIFICATE_PASSWORD
```

| Secret | What |
|---|---|
| `WINDOWS_CERTIFICATE` | the certificate and key, .pfx in base64 |
| `WINDOWS_CERTIFICATE_PASSWORD` | the .pfx's password |

The workflow signs with SHA-256 and an RFC 3161 timestamp, and checks the .msi
with `Get-AuthenticodeSignature`. Since 2023 the private key of a new
code-signing certificate must live in hardware — a token or a cloud HSM (Azure
Trusted Signing, SSL.com eSigner, DigiCert KeyLocker) — and cannot be exported
as a .pfx. With such a certificate, replace the step _Windows signing — the
certificate into this run's store_ with the provider's sign action, and set
`bundle.windows.signCommand` to its tool in the same step's configuration.

**Linux** — the project's own GPG key, free:

```bash
gpg --quick-generate-key "Specgate Studio releases <releases@example.org>" ed25519 sign 2y
gpg --list-secret-keys --keyid-format long      # its fingerprint
gpg --armor --export-secret-keys <FINGERPRINT> | gh secret set GPG_PRIVATE_KEY
gh secret set GPG_PASSPHRASE
gpg --armor --export <FINGERPRINT> > specgate-studio-release.asc   # publish this one
```

| Secret | What |
|---|---|
| `GPG_PRIVATE_KEY` | the armored private key |
| `GPG_PASSPHRASE` | its passphrase |

Publish the public key with the releases and on a key server, so people can
import it before they verify.

**Moving to the organization later.** Signing in the name of rsaglobaltech
needs its verification (a D-U-N-S number for Apple, business validation for
Windows). Only the certificates change: replace the `APPLE_*` and `WINDOWS_*`
secrets; the workflow stays as it is.

## What is proven, and what is not yet

- Proven by tests on every pull request (`npm test`, `cargo test` in
  `desktop-check.yml`): the sidecar on 127.0.0.1, its tree ended when its
  window closes (process group, Job object, closed input), one host per
  project and per window, `serve` joining the desktop's host and an answer
  shared between the two, the update's rule, and the release configuration.
- Proven only by a release with the certificates: that the signed .dmg opens
  with no Gatekeeper warning, that Windows names the owner as publisher, and
  that `gpg --verify` passes on Ubuntu and Fedora.
- Proven only by a real update cycle: an update offered, installed and applied
  on restart, and one with a bad signature refused, end to end.
