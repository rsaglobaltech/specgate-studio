/**
 * draft-desktop budgets measured on the sidecar: REQ-157 SCN-463 — the host
 * idle under 200 MB, the browser's own memory not counted — and REQ-151
 * SCN-451's sidecar share of the 0.8 s cold start. The whole app (window,
 * webview processes, sidecar) and each installer are measured by
 * `npm run measure -w @specgate-studio/desktop` on a release build.
 */
import test, { after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
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
