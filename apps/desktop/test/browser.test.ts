/**
 * draft-desktop REQ-158 — the same UI in a browser with `specgate-studio
 * serve`: run for a project the desktop app has open, it joins that
 * project's host and prints its address, instead of starting a second one.
 */
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { UI_DIST } from "@specgate-studio/cli";
import { endAsTheShell, scratch, sidecar } from "./support.js";

const CLI = fileURLToPath(import.meta.resolve("@specgate-studio/cli")).replace(
  /index\.js$/,
  "bin.js",
);

const made: string[] = [];
const dir = (p: string) => {
  const d = scratch(p);
  made.push(d);
  return d;
};
after(() => {
  for (const d of made) fs.rmSync(d, { recursive: true, force: true });
});

function serveCli(projectDir: string, home: string): Promise<{ code: number | null; out: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI, "serve", "--port", "0"], {
      cwd: projectDir,
      env: { ...process.env, SPECGATE_STUDIO_HOME: home },
      windowsHide: true,
    });
    let out = "";
    child.stdout.setEncoding("utf8").on("data", (c: string) => (out += c));
    child.stderr.setEncoding("utf8").on("data", (c: string) => (out += c));
    const timer = setTimeout(() => child.kill(), 30_000);
    child.on("exit", (code) => (clearTimeout(timer), resolve({ code, out })));
  });
}

test("REQ-158 SCN-464: `specgate-studio serve` in sprich's folder, beside the desktop app, prints the desktop host's address and starts no second host", async () => {
  const home = dir("sg-home-");
  const sprich = dir("sprich-");
  const desktop = await sidecar(sprich, home);
  try {
    const served = await serveCli(sprich, home);
    assert.equal(served.code, 0, served.out);
    assert.match(served.out, /is already open in the studio/);
    assert.ok(served.out.includes(`  ${desktop.ready.url}\n`), served.out);
    assert.equal(fs.readdirSync(path.join(home, "hosts")).length, 1, "one host for sprich");
    // The browser gets the same workbench as the desktop window: the same UI.
    const page = await (await fetch(desktop.ready.url)).text();
    assert.equal(page, fs.readFileSync(path.join(UI_DIST, "index.html"), "utf8"));
  } finally {
    await endAsTheShell(desktop);
  }
});

test("REQ-158 SCN-464: once the desktop window is closed, `serve` starts sprich's host itself, and the desktop app would join it", async () => {
  const home = dir("sg-home-");
  const sprich = dir("sprich-");
  const desktop = await sidecar(sprich, home);
  await endAsTheShell(desktop);
  const child = spawn(process.execPath, [CLI, "serve", "--port", "0"], {
    cwd: sprich,
    env: { ...process.env, SPECGATE_STUDIO_HOME: home },
    windowsHide: true,
  });
  try {
    const url = await new Promise<string>((resolve, reject) => {
      let out = "";
      child.stdout.setEncoding("utf8").on("data", (c: string) => {
        out += c;
        const m = /serving .*\n\s+(http:\/\/127\.0\.0\.1:\d+\/)/.exec(out);
        if (m) resolve(m[1]!);
      });
      child.once("exit", () => reject(new Error(out)));
    });
    const window = await sidecar(sprich, home);
    assert.equal(window.ready.owned, false, "the window joins the browser's host");
    assert.equal(window.ready.url, url);
  } finally {
    child.kill("SIGTERM");
    await new Promise((r) => child.once("exit", r));
  }
});
