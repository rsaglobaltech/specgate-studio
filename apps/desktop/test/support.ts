/**
 * The desktop app's sidecar in tests: started as the Tauri shell starts it —
 * its own process group (a Job object on Windows, in the shell), its input
 * held open — on a scratch folder and a scratch settings folder, never the
 * Developer's.
 */
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { newToken } from "@specgate-studio/host";
import type { Choose, Ready } from "../src/sidecar.js";

export const BIN = fileURLToPath(new URL("../src/bin.js", import.meta.url));
export const WIN = process.platform === "win32";

/** A folder as the studio lists it in its recent projects: `/`-separated. */
export const posix = (p: string) => p.replace(/\\/g, "/");

export function scratch(prefix: string): string {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
}

export interface Sidecar {
  child: ChildProcessWithoutNullStreams;
  first: Ready | Choose;
  ready: Ready;
  exited: Promise<number | null>;
  /** The window's session token: the one the shell gave, or the one the joined host issued (A2). */
  token: string;
  /** The address the shell loads in the window: the host's, with the window's token. */
  page: string;
  /** What the shell's own requests carry. */
  auth: { authorization: string };
}

/**
 * The sidecar on `projectDir` (none: the most recent project), and the line it
 * prints first; given a per-launch token in its environment, as the shell gives it.
 */
export async function sidecar(
  projectDir: string | null,
  home: string,
  given: string | null = newToken(),
): Promise<Sidecar> {
  const args = [BIN, ...(projectDir ? ["--project-dir", projectDir] : [])];
  const env: NodeJS.ProcessEnv = { ...process.env, SPECGATE_STUDIO_LOGIN_PATH: "0" };
  if (given) env.SPECGATE_STUDIO_TOKEN = given;
  const child = spawn(process.execPath, [...args, "--home", home, "--exit-with-stdin"], {
    stdio: ["pipe", "pipe", "pipe"],
    detached: !WIN,
    windowsHide: true,
    env,
  });
  const exited = new Promise<number | null>((ok) => child.once("exit", (code) => ok(code)));
  let err = "";
  child.stderr.setEncoding("utf8").on("data", (c: string) => (err += c));
  const first = await new Promise<Ready | Choose>((resolve, reject) => {
    let out = "";
    const timer = setTimeout(() => reject(new Error(`no line from the sidecar: ${err}`)), 30_000);
    child.stdout.setEncoding("utf8").on("data", (c: string) => {
      out += c;
      const nl = out.indexOf("\n");
      if (nl < 0) return;
      clearTimeout(timer);
      try {
        resolve(JSON.parse(out.slice(0, nl)) as Ready | Choose);
      } catch {
        reject(new Error(`not a JSON line: ${out}`));
      }
    });
    child.once("exit", (code) => reject(new Error(`the sidecar ended (${code}): ${err}`)));
  });
  const ready = first as Ready;
  const token = ready.token ?? given ?? "";
  const page = ready.url ? `${ready.url}?token=${token}` : "";
  return { child, first, ready, exited, token, page, auth: { authorization: `Bearer ${token}` } };
}

/** Ends the sidecar as the shell does when its window closes: its input closed, then its group. */
export async function endAsTheShell(s: Sidecar): Promise<void> {
  s.child.stdin.end();
  if (!WIN) {
    try {
      process.kill(-s.child.pid!, "SIGTERM");
    } catch {
      /* ended already */
    }
  }
  await s.exited;
}

export function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** Every process under `root`, now. */
export function descendants(root: number): number[] {
  const edges: Array<[number, number]> = [];
  if (WIN) {
    const r = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        'Get-CimInstance Win32_Process | ForEach-Object { "$($_.ProcessId) $($_.ParentProcessId)" }',
      ],
      { encoding: "utf8", windowsHide: true },
    );
    for (const line of r.stdout.split(/\r?\n/)) {
      const [pid, ppid] = line.trim().split(/\s+/).map(Number);
      if (pid && ppid !== undefined) edges.push([pid, ppid]);
    }
  } else {
    const r = spawnSync("ps", ["-A", "-o", "pid=,ppid="], { encoding: "utf8" });
    for (const line of r.stdout.split("\n")) {
      const [pid, ppid] = line.trim().split(/\s+/).map(Number);
      if (pid && ppid !== undefined) edges.push([pid, ppid]);
    }
  }
  const found: number[] = [];
  const queue = [root];
  while (queue.length) {
    const parent = queue.shift()!;
    for (const [pid, ppid] of edges)
      if (ppid === parent && !found.includes(pid)) (found.push(pid), queue.push(pid));
  }
  return found;
}

/** Waits until `check` holds, or fails after `ms`. */
export async function until(check: () => boolean, ms: number, what: string): Promise<void> {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error(`timed out: ${what}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

/** The resident memory of a process, in MB. */
export function residentMb(pid: number): number {
  if (WIN) {
    const r = spawnSync(
      "powershell",
      ["-NoProfile", "-Command", `(Get-Process -Id ${pid}).WorkingSet64`],
      { encoding: "utf8", windowsHide: true },
    );
    return Number(r.stdout.trim()) / 1024 / 1024;
  }
  const r = spawnSync("ps", ["-o", "rss=", "-p", String(pid)], { encoding: "utf8" });
  return Number(r.stdout.trim()) / 1024;
}
