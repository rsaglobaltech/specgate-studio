#!/usr/bin/env node
/**
 * The updater's manifest (draft-desktop REQ-156): `latest.json` for a
 * release, from the `.sig` files `tauri build` wrote beside each update.
 * Installed studios read it on start from the latest published release.
 *
 *   node scripts/latest-json.mjs --tag desktop-v0.1.0 --repo owner/name --dir <folder of .sig files>
 */
import * as fs from "node:fs";
import * as path from "node:path";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  const v = i > 0 ? process.argv[i + 1] : undefined;
  if (!v) throw new Error(`--${name} is required`);
  return v;
}

const tag = arg("tag");
const repo = arg("repo");
const dir = arg("dir");

/** Which platform an update file is for, as Tauri's updater names them. */
function platformOf(file) {
  if (/aarch64-apple-darwin\.app\.tar\.gz$/.test(file)) return "darwin-aarch64";
  if (/x86_64-apple-darwin\.app\.tar\.gz$/.test(file)) return "darwin-x86_64";
  if (/x64.*\.msi$/.test(file)) return "windows-x86_64";
  if (/amd64\.AppImage$/.test(file)) return "linux-x86_64";
  return null;
}

const platforms = {};
for (const sig of fs.readdirSync(dir).filter((f) => f.endsWith(".sig"))) {
  const asset = sig.slice(0, -".sig".length);
  const platform = platformOf(asset);
  if (!platform) continue;
  platforms[platform] = {
    signature: fs.readFileSync(path.join(dir, sig), "utf8").trim(),
    url: `https://github.com/${repo}/releases/download/${tag}/${encodeURIComponent(asset)}`,
  };
}
if (Object.keys(platforms).length === 0) throw new Error(`no update signature in ${dir}`);
process.stdout.write(
  JSON.stringify(
    {
      version: tag.replace(/^desktop-v/, ""),
      notes: `https://github.com/${repo}/releases/tag/${tag}`,
      pub_date: new Date().toISOString(),
      platforms,
    },
    null,
    2,
  ) + "\n",
);
