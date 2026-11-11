/**
 * draft-desktop REQ-153, REQ-154, REQ-155, REQ-156 — how the installers are
 * made: one release workflow on macOS, Windows and Linux runners, unsigned
 * now with the documented steps past each system's warning, and a signing
 * step per platform that runs only once its secrets exist. These read the
 * configuration; that a signed installer opens without a warning is proven
 * only by a release built with the certificates (docs/desktop.md).
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";

const at = (rel: string) => fileURLToPath(new URL(`../../../../${rel}`, import.meta.url));
const read = (rel: string) => fs.readFileSync(at(rel), "utf8");

const conf = JSON.parse(read("apps/desktop/src-tauri/tauri.conf.json"));
const workflow = read(".github/workflows/desktop-release.yml");
const docs = read("docs/desktop.md");

/** The steps of the workflow, by name, with their text. */
function step(name: string): string {
  const start = workflow.indexOf(`- name: ${name}`);
  assert.ok(start >= 0, `a step named "${name}"`);
  const next = workflow.indexOf("\n      - ", start + 1);
  return workflow.slice(start, next < 0 ? undefined : next);
}

test("REQ-153 REQ-154 REQ-155: one release workflow, on a desktop-v* tag or by hand, builds every installer on its own system", () => {
  assert.match(workflow, /on:\n {2}push:\n {4}tags: \['desktop-v\*'\]\n {2}workflow_dispatch:/);
  for (const [os, target, bundles] of [
    ["macos-latest", "aarch64-apple-darwin", "app,dmg"],
    ["macos-latest", "x86_64-apple-darwin", "app,dmg"],
    ["windows-latest", "x86_64-pc-windows-msvc", "msi"],
    ["ubuntu-22.04", "x86_64-unknown-linux-gnu", "appimage,deb"],
  ])
    assert.match(
      workflow,
      new RegExp(`os: ${os}\\n\\s+target: ${target}\\n\\s+bundles: ${bundles}`),
      `${target} on ${os}`,
    );
  assert.deepEqual(conf.bundle.targets, ["app", "dmg", "msi", "appimage", "deb"]);
  // The release is a draft: a person publishes it.
  assert.match(workflow, /gh release create "\$TAG" --draft/);
});

test("REQ-153 SCN-466: the unsigned .dmg is ad-hoc signed, and its release links the documented Open anyway steps", () => {
  assert.equal(
    conf.bundle.macOS.signingIdentity,
    "-",
    "ad-hoc: Apple silicon runs nothing unsigned",
  );
  assert.match(workflow, /Follow \[Open anyway\]\(\$DOCS#macos-open-anyway\)/);
  assert.match(docs, /^### macOS: Open anyway$/m);
  assert.match(docs, /Privacy & Security/);
  assert.match(docs, /Open Anyway/);
  assert.match(docs, /xattr -dr com\.apple\.quarantine "\/Applications\/Specgate Studio\.app"/);
  assert.match(step("macOS — the app's signature"), /codesign --verify --deep --strict/);
});

test("REQ-153 SCN-455: the macOS signing step runs only once the Developer ID secrets exist, notarizes, and is checked with spctl", () => {
  assert.match(
    workflow,
    /HAS_APPLE: \$\{\{ secrets\.APPLE_CERTIFICATE != '' && secrets\.APPLE_SIGNING_IDENTITY != '' \}\}/,
  );
  const sign = step("macOS signing — Developer ID into a keychain of this run");
  assert.match(sign, /if: runner\.os == 'macOS' && env\.HAS_APPLE == 'true'/);
  assert.match(sign, /codesign --force --timestamp --options runtime/);
  assert.match(step("macOS signing — the notarization key"), /env\.HAS_NOTARY == 'true'/);
  assert.match(
    workflow,
    /APPLE_API_KEY: \$\{\{ env\.HAS_NOTARY == 'true' && secrets\.APPLE_API_KEY/,
  );
  assert.match(step("macOS — the app's signature"), /spctl --assess --type execute/);
  // The hardened runtime with what Node needs: V8's JIT, node-pty's native module.
  assert.equal(conf.bundle.macOS.hardenedRuntime, true);
  const plist = read("apps/desktop/src-tauri/entitlements.plist");
  assert.match(plist, /com\.apple\.security\.cs\.allow-jit/);
  assert.match(plist, /com\.apple\.security\.cs\.disable-library-validation/);
  // Moving to the organization changes only the certificate: no name in the pipeline.
  assert.doesNotMatch(workflow, /Developer ID Application:/);
});

test("REQ-154 SCN-467: the unsigned .msi's release links the documented SmartScreen steps", () => {
  assert.match(workflow, /Follow \[Run anyway\]\(\$DOCS#windows-smartscreen\)/);
  assert.match(docs, /^### Windows: SmartScreen$/m);
  assert.match(docs, /More info/);
  assert.match(docs, /Run anyway/);
});

test("REQ-154 SCN-456: the Windows signing step runs only once its certificate exists, timestamps, and checks Get-AuthenticodeSignature", () => {
  assert.match(workflow, /HAS_WINDOWS: \$\{\{ secrets\.WINDOWS_CERTIFICATE != '' \}\}/);
  assert.match(
    step("Windows signing — the certificate into this run's store"),
    /if: runner\.os == 'Windows' && env\.HAS_WINDOWS == 'true'/,
  );
  assert.match(workflow, /certificateThumbprint: process\.env\.WINDOWS_THUMBPRINT/);
  assert.match(workflow, /timestampUrl: "http:\/\/timestamp\.digicert\.com"/);
  const check = step("Windows — the installer's signature");
  assert.match(check, /Get-AuthenticodeSignature/);
  assert.match(check, /-ne 'Valid'/);
});

test("REQ-155 SCN-457 SCN-458: the .AppImage and the .deb get a GPG signature, in a step that runs only when its key exists", () => {
  const gpg = step("Linux — GPG signatures");
  assert.match(gpg, /if: runner\.os == 'Linux' && env\.HAS_GPG == 'true'/);
  assert.match(workflow, /HAS_GPG: \$\{\{ secrets\.GPG_PRIVATE_KEY != '' \}\}/);
  assert.match(gpg, /\*\.AppImage/);
  assert.match(gpg, /\*\.deb/);
  assert.match(gpg, /--armor --detach-sign --output "\$f\.asc"/);
  assert.match(gpg, /gpg --batch --verify "\$f\.asc" "\$f"/);
  assert.match(docs, /^### Linux: verify$/m);
  assert.match(docs, /gpg --verify "Specgate\.Studio_[^"]+\.deb\.asc"/);
});

test("REQ-156: the updater checks the latest GitHub release, with its own key, and the release publishes latest.json once the key exists", () => {
  const updater = conf.plugins.updater;
  assert.deepEqual(updater.endpoints, [
    "https://github.com/rsaglobaltech/specgate-studio/releases/latest/download/latest.json",
  ]);
  // The owner sets the real public key (docs/desktop.md): nobody generated it here.
  assert.equal(updater.pubkey, "REPLACE_WITH_TAURI_UPDATER_PUBLIC_KEY");
  assert.equal(conf.bundle.createUpdaterArtifacts, false, "turned on by the release, with the key");
  assert.match(workflow, /HAS_UPDATER: \$\{\{ secrets\.TAURI_SIGNING_PRIVATE_KEY != '' \}\}/);
  assert.match(workflow, /c\.bundle\.createUpdaterArtifacts = true/);
  assert.match(workflow, /latest-json\.mjs/);
  assert.match(docs, /npx tauri signer generate/);
});

test("REQ-153 REQ-154 REQ-155: nothing is signed on a developer's machine — every secret is read in the workflow only", () => {
  for (const secret of [
    "APPLE_CERTIFICATE",
    "APPLE_CERTIFICATE_PASSWORD",
    "APPLE_SIGNING_IDENTITY",
    "APPLE_API_KEY",
    "APPLE_API_ISSUER",
    "APPLE_API_PRIVATE_KEY",
    "WINDOWS_CERTIFICATE",
    "WINDOWS_CERTIFICATE_PASSWORD",
    "GPG_PRIVATE_KEY",
    "GPG_PASSPHRASE",
    "TAURI_SIGNING_PRIVATE_KEY",
    "TAURI_SIGNING_PRIVATE_KEY_PASSWORD",
  ]) {
    assert.ok(workflow.includes(`secrets.${secret}`), `${secret} read by the workflow`);
    assert.ok(docs.includes(`\`${secret}\``), `${secret} documented`);
  }
  const ignored = read("apps/desktop/src-tauri/.gitignore");
  assert.match(ignored, /binaries\/studio-node-\*/);
});
