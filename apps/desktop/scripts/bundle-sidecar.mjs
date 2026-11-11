#!/usr/bin/env node
/**
 * The desktop app's sidecar, made ready for `tauri build` (draft-desktop
 * REQ-151, ADR-0002): the Node runtime the app ships and the core host it
 * runs, for one target.
 *
 *   src-tauri/binaries/studio-node-<target>[.exe]  Node 22, from nodejs.org, its SHA-256 checked
 *   dist/sidecar/sidecar.mjs                       the host and its adapters in one file (esbuild)
 *   dist/sidecar/ui/                               the UI apps/ui built: the same as the browser's
 *   dist/sidecar/node_modules/                     what cannot be bundled: node-pty's native
 *                                                  module for the target, and specgate itself
 *
 * The target is Tauri's (`TAURI_ENV_TARGET_TRIPLE`), `--target <triple>`, or
 * this machine's. Run `npm run build` at the root first.
 *
 *   node scripts/bundle-sidecar.mjs [--target <triple>]
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const NODE_VERSION = "22.23.5";
/** From https://nodejs.org/dist/v22.23.5/SHASUMS256.txt */
const NODE = {
  "x86_64-apple-darwin": {
    file: "darwin-x64.tar.gz",
    sha256: "c53383238206b9ae4db23c5d8a63645e2e753bec8ab51a49cc81939aa64e9422",
    os: "darwin",
    cpu: "x64",
  },
  "aarch64-apple-darwin": {
    file: "darwin-arm64.tar.gz",
    sha256: "e7131995759b61a0170b646010d2ad35a5d37b4cb0d471f3e8317eac6f742f3d",
    os: "darwin",
    cpu: "arm64",
  },
  "x86_64-unknown-linux-gnu": {
    file: "linux-x64.tar.gz",
    sha256: "c54118104acc524633b5abe106bbf44a53126ec8b4e5fa105cb92b5d7de8a1a1",
    os: "linux",
    cpu: "x64",
  },
  "aarch64-unknown-linux-gnu": {
    file: "linux-arm64.tar.gz",
    sha256: "8bd3dc69eee8f3f226315a80d7d1d4faccf217a4c8fae500168ac2e38f3bdba3",
    os: "linux",
    cpu: "arm64",
  },
  "x86_64-pc-windows-msvc": {
    file: "win-x64.zip",
    sha256: "4a191082e9706866830379d577d2cc8a50c776fcd9436a8d061b063ed0d9a0e3",
    os: "win32",
    cpu: "x64",
  },
  "aarch64-pc-windows-msvc": {
    file: "win-arm64.zip",
    sha256: "c1856817f611738c77534efbff8a5a17990593eab24046bc8d2c23a77a160d13",
    os: "win32",
    cpu: "arm64",
  },
};

const DESKTOP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.resolve(DESKTOP, "../..");
const OUT = path.join(DESKTOP, "dist", "sidecar");
const CACHE = path.join(DESKTOP, "dist", "node-cache");
const BINARIES = path.join(DESKTOP, "src-tauri", "binaries");
const WIN = process.platform === "win32";

function hostTriple() {
  try {
    const out = execFileSync("rustc", ["-vV"], { encoding: "utf8" });
    return /^host: (.+)$/m.exec(out)?.[1]?.trim();
  } catch {
    return undefined;
  }
}

function target() {
  const i = process.argv.indexOf("--target");
  const t = (i > 0 && process.argv[i + 1]) || process.env.TAURI_ENV_TARGET_TRIPLE || hostTriple();
  if (!t || !NODE[t]) throw new Error(`no Node runtime for target ${t ?? "(unknown)"}`);
  return t;
}

function say(text) {
  process.stdout.write(`sidecar: ${text}\n`);
}

function sha256(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

async function download(url, file) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

/** Node for the target, beside the shell as Tauri expects an external binary. */
async function nodeRuntime(triple) {
  const { file, sha256: want } = NODE[triple];
  const name = `node-v${NODE_VERSION}-${file}`;
  const archive = path.join(CACHE, name);
  fs.mkdirSync(CACHE, { recursive: true });
  if (!fs.existsSync(archive) || sha256(archive) !== want) {
    say(`downloading ${name}`);
    await download(`https://nodejs.org/dist/v${NODE_VERSION}/${name}`, archive);
  }
  const got = sha256(archive);
  if (got !== want) throw new Error(`${name}: SHA-256 ${got}, expected ${want}`);
  const base = name.replace(/\.(tar\.gz|zip)$/, "");
  const exe = triple.includes("windows") ? "node.exe" : "node";
  const inside = triple.includes("windows") ? `${base}/${exe}` : `${base}/bin/${exe}`;
  const unpacked = path.join(CACHE, base);
  fs.rmSync(unpacked, { recursive: true, force: true });
  // bsdtar (macOS, Windows' own) reads .zip too; GNU tar (Linux) only needs .tar.gz.
  // On Windows, Git's GNU tar may come first on the PATH: Windows' own is named.
  const tar = WIN
    ? path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe")
    : "tar";
  execFileSync(tar, ["-xf", archive, "-C", CACHE, inside], { stdio: "inherit" });
  const dest = path.join(
    BINARIES,
    `studio-node-${triple}${triple.includes("windows") ? ".exe" : ""}`,
  );
  fs.mkdirSync(BINARIES, { recursive: true });
  fs.copyFileSync(path.join(CACHE, inside), dest);
  fs.chmodSync(dest, 0o755);
  say(`Node ${NODE_VERSION} → ${path.relative(DESKTOP, dest)}`);
}

function versionOf(pkg) {
  const json = path.join(ROOT, "node_modules", ...pkg.split("/"), "package.json");
  return JSON.parse(fs.readFileSync(json, "utf8")).version;
}

/** The host in one file, the UI beside it, and the two packages that stay files. */
async function host(triple) {
  const entry = path.join(DESKTOP, "dist", "src", "bin.js");
  const ui = path.join(ROOT, "apps", "ui", "dist");
  for (const need of [entry, path.join(ui, "index.html")])
    if (!fs.existsSync(need)) throw new Error(`${need} is missing: run npm run build at the root`);
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const esbuild = await import("esbuild");
  await esbuild.build({
    entryPoints: [entry],
    outfile: path.join(OUT, "sidecar.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    legalComments: "none",
    // node-pty loads a native module; specgate is run as a program, from its files.
    external: ["@lydell/node-pty", "@rsaglobaltech/specgate", "bufferutil", "utf-8-validate"],
    banner: {
      js: 'import { createRequire as __studioRequire } from "node:module"; const require = __studioRequire(import.meta.url);',
    },
    logLevel: "warning",
  });
  fs.cpSync(ui, path.join(OUT, "ui"), { recursive: true });

  const { os: npmOs, cpu } = NODE[triple];
  const pty = "@lydell/node-pty";
  const specgate = "@rsaglobaltech/specgate";
  fs.writeFileSync(
    path.join(OUT, "package.json"),
    JSON.stringify(
      {
        name: "specgate-studio-sidecar",
        private: true,
        type: "module",
        dependencies: { [pty]: versionOf(pty), [specgate]: versionOf(specgate) },
      },
      null,
      2,
    ) + "\n",
  );
  say(`installing ${pty} and ${specgate} for ${npmOs}-${cpu}`);
  execFileSync(
    WIN ? "npm.cmd" : "npm",
    [
      "install",
      "--omit=dev",
      "--no-package-lock",
      "--no-audit",
      "--no-fund",
      "--ignore-scripts",
      `--os=${npmOs}`,
      `--cpu=${cpu}`,
    ],
    { cwd: OUT, stdio: "inherit", shell: WIN },
  );
  const native = path.join(OUT, "node_modules", "@lydell", `node-pty-${npmOs}-${cpu}`);
  if (!fs.existsSync(native)) throw new Error(`${native} was not installed`);
  // Only the target's native module ships.
  for (const d of fs.readdirSync(path.join(OUT, "node_modules", "@lydell")))
    if (d.startsWith("node-pty-") && d !== `node-pty-${npmOs}-${cpu}`)
      fs.rmSync(path.join(OUT, "node_modules", "@lydell", d), { recursive: true, force: true });
}

if (process.env.STUDIO_SIDECAR_PREBUILT === "1") {
  // The release workflow made it in a step of its own, and signed what it holds.
  say("made already (STUDIO_SIDECAR_PREBUILT=1)");
  process.exit(0);
}
const triple = target();
say(`target ${triple} (on ${os.platform()}-${os.arch()})`);
await nodeRuntime(triple);
await host(triple);
say("ready");
