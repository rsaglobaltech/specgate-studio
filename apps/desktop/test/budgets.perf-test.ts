/**
 * draft-desktop budgets measured on the sidecar: REQ-157 SCN-463 — the host
 * idle under 200 MB, the browser's own memory not counted — and REQ-151
 * SCN-451's sidecar share of the 0.8 s cold start. The whole app (window,
 * webview processes, sidecar) and each installer are measured by
 * `npm run measure -w @specgate-studio/desktop` on a release build: the
 * last tests here run it when one is built (SCN-462, REQ-035 SCN-099).
 */
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { endAsTheShell, residentMb, scratch, sidecar } from "./support.js";

const IDLE_MS = Number(process.env.STUDIO_IDLE_MS ?? 10_000);
/** Timing budgets are measured on the Linux runner (draft-workbench A12); elsewhere on request. */
const PERF = process.platform === "linux" || process.env.STUDIO_PERF === "1";

const made: string[] = [];
after(() => {
  for (const d of made) fs.rmSync(d, { recursive: true, force: true });
});

test("REQ-157 SCN-463: the host idle, one UI connected and untouched, stays under 200 MB", async () => {
  const home = scratch("sg-home-");
  const sprich = scratch("sprich-");
  made.push(home, sprich);
  const s = await sidecar(sprich, home);
  try {
    await (await fetch(s.ready.url, { headers: s.auth })).text();
    const ui = new WebSocket(s.page.replace(/^http/, "ws"));
    await new Promise((ok, ko) => ui.once("open", ok).once("error", ko));
    await new Promise((r) => setTimeout(r, IDLE_MS));
    ui.close();
    const mb = residentMb(s.child.pid!);
    process.stdout.write(`# host idle ${IDLE_MS / 1000} s: ${mb.toFixed(1)} MB resident\n`);
    assert.ok(mb > 0, "measured");
    assert.ok(mb < 200, `${mb.toFixed(1)} MB`);
  } finally {
    await endAsTheShell(s);
  }
});

test(
  "REQ-151 SCN-451: the sidecar answers with the UI well inside the 0.8 s cold start",
  { skip: !PERF && "timing budgets run on the Linux runner, or with STUDIO_PERF=1" },
  async () => {
    const home = scratch("sg-home-");
    const sprich = scratch("sprich-");
    made.push(home, sprich);
    const start = performance.now();
    const s = await sidecar(sprich, home);
    try {
      await (await fetch(s.ready.url, { headers: s.auth })).text();
      const ms = performance.now() - start;
      process.stdout.write(`# sidecar ready and UI served in ${ms.toFixed(0)} ms\n`);
      assert.ok(ms < 800, `${ms.toFixed(0)} ms`);
    } finally {
      await endAsTheShell(s);
    }
  },
);

// ── The release build: the whole app and its installers (SCN-462, SCN-099) ──

const MEASURE = fileURLToPath(new URL("../../scripts/measure.mjs", import.meta.url));
const TARGET = fileURLToPath(new URL("../../src-tauri/target", import.meta.url));
/** The Rust target triple the release was built for, if not the host's (STUDIO_TARGET). */
const TRIPLE = process.env.STUDIO_TARGET;
const BUNDLE = [
  TRIPLE && path.join(TARGET, TRIPLE, "release", "bundle"),
  path.join(TARGET, "release", "bundle"),
]
  .filter((d): d is string => Boolean(d))
  .find((d) => fs.existsSync(d));
const NO_RELEASE = !BUNDLE && "no release build: `npx tauri build` in apps/desktop, then run again";

/** measure.mjs with these flags; its report goes to the test's output. */
function measure(...flags: string[]): number | null {
  const r = spawnSync(
    process.execPath,
    [MEASURE, ...flags, ...(TRIPLE ? ["--target", TRIPLE] : [])],
    {
      encoding: "utf8",
      timeout: 180_000,
    },
  );
  process.stdout.write((r.stdout ?? "").replace(/^/gm, "# ") + "\n");
  if (r.stderr) process.stdout.write(r.stderr.replace(/^/gm, "# ") + "\n");
  return r.status;
}

test(
  "REQ-157 SCN-462: the release build idle with one project under 200 MB, and each installer under 80 MB",
  { skip: NO_RELEASE },
  () => {
    const sprich = scratch("sprich-");
    made.push(sprich);
    assert.equal(measure("--sizes"), 0, "an installer is 80 MB or more");
    assert.equal(
      measure(
        "--memory",
        "--project",
        sprich,
        "--idle",
        String(Number(process.env.STUDIO_IDLE_S ?? 60)),
      ),
      0,
      "the app idle used 200 MB or more, or left a process behind",
    );
  },
);

test(
  "REQ-035 SCN-099: the release build's window with the activity bar in under 300 ms, the palette from Ctrl+Shift+P in under 1 s",
  {
    skip: NO_RELEASE || (!PERF && "timing budgets run on the Linux runner, or with STUDIO_PERF=1"),
  },
  () => {
    const sprich = scratch("sprich-");
    made.push(sprich);
    assert.equal(measure("--cold-start", "--project", sprich), 0, "over the cold start's budget");
  },
);
