#!/usr/bin/env node
/**
 * The desktop app's budgets (draft-desktop REQ-157, A10): each installer
 * under 80 MB, and the app idle under 200 MB of memory with one project open.
 *
 *   node scripts/measure.mjs --sizes [--target <triple>]
 *     the size of each installer `tauri build` wrote; fails at 80 MB or more.
 *
 *   node scripts/measure.mjs --memory --project <folder> [--app <path>] [--idle <s>] [--target <triple>]
 *     starts the release build on <folder> (a scratch project: never a real
 *     repository), waits <s> seconds untouched (60 by default), and adds up the
 *     resident memory of every process of the app — the window, its webview
 *     processes and the sidecar with its children — then quits it and checks
 *     no sidecar is left. Fails at 200 MB or more.
 *
 *   node scripts/measure.mjs --cold-start --project <folder> [--app <path>] [--target <triple>]
 *     starts the release build on <folder> with STUDIO_MEASURE set: its page,
 *     as soon as the activity bar shows, presses the palette's shortcut and
 *     reports both moments (apps/ui/src/measure.ts). Fails unless the window
 *     shows in under 300 ms and the palette opens in under 1 s, both from the
 *     launch (draft-workbench REQ-035 SCN-099).
 *
 * "MB" is 10^6 bytes, the stricter reading. On macOS the webview's processes
 * (com.apple.WebKit.*) are not the app's children: the ones that appear while
 * the app starts are counted as its own, so a browser opening WebKit pages at
 * that moment would be counted too.
 */
import { execFileSync, spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const DESKTOP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGET_DIR = path.join(DESKTOP, "src-tauri", "target");
const MB = 1_000_000;
const INSTALLER_BUDGET = 80 * MB;
const MEMORY_BUDGET = 200 * MB;
const VISIBLE_BUDGET_MS = 300;
const INTERACTIVE_BUDGET_MS = 1000;

function flag(name) {
  return process.argv.includes(`--${name}`);
}
function value(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

function bundleDir() {
  const t = value("target");
  const dirs = [
    t && path.join(TARGET_DIR, t, "release", "bundle"),
    path.join(TARGET_DIR, "release", "bundle"),
  ];
  const found = dirs.find((d) => d && fs.existsSync(d));
  if (!found) throw new Error(`no bundle under ${TARGET_DIR}: run npx tauri build first`);
  return found;
}

function sizes() {
  const dir = bundleDir();
  const kinds = { dmg: ".dmg", msi: ".msi", appimage: ".AppImage", deb: ".deb" };
  const rows = [];
  for (const [sub, ext] of Object.entries(kinds)) {
    const d = path.join(dir, sub);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter((x) => x.endsWith(ext)))
      rows.push({ file: f, bytes: fs.statSync(path.join(d, f)).size });
  }
  if (!rows.length) throw new Error(`no installer in ${dir}`);
  let ok = true;
  for (const r of rows) {
    const within = r.bytes < INSTALLER_BUDGET;
    ok &&= within;
    console.log(
      `${within ? "ok  " : "OVER"} ${(r.bytes / MB).toFixed(1).padStart(6)} MB  ${r.file}  (budget 80 MB)`,
    );
  }
  return ok;
}

/** pid, ppid, resident bytes and command of every process. */
function processes() {
  if (process.platform === "win32") {
    const out = execFileSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        'Get-CimInstance Win32_Process | ForEach-Object { "$($_.ProcessId)`t$($_.ParentProcessId)`t$($_.WorkingSetSize)`t$($_.Name)" }',
      ],
      { encoding: "utf8", maxBuffer: 1 << 26 },
    );
    return out
      .split(/\r?\n/)
      .filter(Boolean)
      .map((l) => {
        const [pid, ppid, ws, name] = l.split("\t");
        return { pid: Number(pid), ppid: Number(ppid), rss: Number(ws), command: name ?? "" };
      });
  }
  const out = execFileSync("ps", ["-A", "-o", "pid=,ppid=,rss=,command="], {
    encoding: "utf8",
    maxBuffer: 1 << 26,
  });
  return out
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => {
      const m = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/.exec(l);
      return m ? { pid: +m[1], ppid: +m[2], rss: +m[3] * 1024, command: m[4] } : null;
    })
    .filter(Boolean);
}

function tree(all, root) {
  const out = [];
  const queue = [root];
  while (queue.length) {
    const p = queue.shift();
    for (const c of all)
      if (c.ppid === p && !out.some((x) => x.pid === c.pid)) (out.push(c), queue.push(c.pid));
  }
  return out;
}

const isWebKit = (c) => /com\.apple\.WebKit\./.test(c.command);
const isSidecar = (c) => /studio-node/.test(c.command);

function appPath() {
  const given = value("app");
  if (given) return given;
  const dir = bundleDir();
  if (process.platform === "darwin") {
    const app = fs.readdirSync(path.join(dir, "macos")).find((f) => f.endsWith(".app"));
    return path.join(dir, "macos", app, "Contents", "MacOS", "specgate-studio");
  }
  const release = path.dirname(dir);
  return path.join(
    release,
    process.platform === "win32" ? "specgate-studio.exe" : "specgate-studio",
  );
}

async function memory() {
  const project = value("project");
  if (!project || !fs.existsSync(project))
    throw new Error("--project <a scratch project folder> is required");
  const idle = Number(value("idle") ?? 60);
  const before = new Set(
    processes()
      .filter(isWebKit)
      .map((p) => p.pid),
  );
  const started = Date.now();
  const app = spawn(appPath(), [path.resolve(project)], { stdio: "ignore" });
  // The sidecar's line, the window, the page: wait until the sidecar runs.
  for (let i = 0; i < 300; i++) {
    if (tree(processes(), app.pid).some(isSidecar)) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  const sidecarAfter = ((Date.now() - started) / 1000).toFixed(2);
  console.log(`app ${app.pid} started; sidecar running after ${sidecarAfter} s; idle ${idle} s…`);
  await new Promise((r) => setTimeout(r, idle * 1000));
  const all = processes();
  const own = [all.find((p) => p.pid === app.pid), ...tree(all, app.pid)].filter(Boolean);
  if (process.platform === "darwin")
    for (const w of all.filter(isWebKit))
      if (!before.has(w.pid) && !own.some((o) => o.pid === w.pid)) own.push(w);
  let total = 0;
  for (const p of own) {
    total += p.rss;
    console.log(
      `  ${(p.rss / MB).toFixed(1).padStart(6)} MB  ${p.pid}  ${p.command.slice(0, 110)}`,
    );
  }
  const within = total < MEMORY_BUDGET;
  console.log(
    `${within ? "ok  " : "OVER"} ${(total / MB).toFixed(1)} MB resident in ${own.length} processes (budget 200 MB)`,
  );

  // Quit as the Developer does, then check nothing of the sidecar is left.
  const sidecars = own.filter(isSidecar).map((p) => p.pid);
  const left = own.filter((p) => p.pid !== app.pid && !isWebKit(p)).map((p) => p.pid);
  await quit(app);
  await new Promise((r) => setTimeout(r, 4_000));
  const still = processes().filter((p) => left.includes(p.pid));
  console.log(
    still.length
      ? `LEFT ${still.length} process(es) of the app after it quit: ${still.map((p) => `${p.pid} ${p.command}`).join("; ")}`
      : `quit: none of the app's ${left.length} child process(es) is left (sidecar ${sidecars.join(", ")})`,
  );
  return within && still.length === 0;
}

/** Quits the app as the Developer does. */
async function quit(app) {
  if (process.platform === "darwin") {
    try {
      execFileSync("osascript", ["-e", 'quit app "Specgate Studio"']);
    } catch {
      app.kill("SIGTERM");
    }
  } else app.kill("SIGTERM");
  await new Promise((r) => (app.exitCode !== null ? r() : app.once("exit", r)));
}

async function coldStart() {
  const project = value("project");
  if (!project || !fs.existsSync(project))
    throw new Error("--project <a scratch project folder> is required");
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "studio-measure-")), "cold-start.json");
  const launched = Date.now();
  const app = spawn(appPath(), [path.resolve(project)], {
    stdio: "ignore",
    env: { ...process.env, STUDIO_MEASURE: out },
  });
  for (let i = 0; i < 300 && !fs.existsSync(out); i++) await new Promise((r) => setTimeout(r, 50));
  if (!fs.existsSync(out)) {
    await quit(app);
    console.log("OVER the page reported no cold start within 15 s");
    return false;
  }
  const m = JSON.parse(fs.readFileSync(out, "utf8"));
  await quit(app);
  fs.rmSync(path.dirname(out), { recursive: true, force: true });
  const visible = m.visible - launched;
  const palette = m.palette - launched;
  const rows = [
    ["window with the activity bar", visible, VISIBLE_BUDGET_MS],
    ["command palette open", palette, INTERACTIVE_BUDGET_MS],
  ];
  let ok = true;
  for (const [what, ms, budget] of rows) {
    ok &&= ms < budget;
    console.log(`${ms < budget ? "ok  " : "OVER"} ${ms.toFixed(0).padStart(6)} ms  ${what}  (budget ${budget} ms)`);
  }
  console.log(`  (the page itself started ${(m.origin - launched).toFixed(0)} ms after the launch)`);
  return ok;
}

let ok = true;
if (flag("sizes")) ok = sizes() && ok;
if (flag("memory")) ok = (await memory()) && ok;
if (flag("cold-start")) ok = (await coldStart()) && ok;
if (!flag("sizes") && !flag("memory") && !flag("cold-start")) {
  console.error("say --sizes, --memory, --cold-start, or several");
  process.exit(2);
}
process.exit(ok ? 0 : 1);
