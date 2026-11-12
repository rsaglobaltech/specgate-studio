import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { RecentProjects } from "@specgate-studio/core";
import {
  NodeStore,
  caseInsensitivePaths,
  studioHome,
  systemClock,
} from "@specgate-studio/adapter-node";
import { serveOrJoin, type Joined, type Served } from "@specgate-studio/cli";

/**
 * The desktop app's sidecar (draft-desktop REQ-151, ADR-0002): the project's
 * core host, run by the Node the app ships, on 127.0.0.1 only. The Tauri shell
 * starts one per project window, reads the one line it prints, and loads its
 * address in the window. The sidecar wires nothing of its own: it is
 * `serveOrJoin` (apps/cli), so the window and `specgate-studio serve` share
 * one host per project (REQ-158).
 *
 *   sidecar [--project-dir <dir>] [--home <dir>] [--ui <dir>] [--exit-with-stdin]
 *     prints {"type":"ready",url,key,projectDir,owned,recent} — or, with no
 *     folder given and none recent, {"type":"choose",recent} — on one line.
 *     A host it joined is not its own: it exits once it has said so.
 *     Its own host ends, with every process it started, on SIGTERM, SIGINT,
 *     SIGHUP or — with --exit-with-stdin — when the shell closes its input.
 *
 *   sidecar update-step --url <address> --phase <p> --from <v> --to <v> [--reason <r>]
 *     asks that host what the update does next (REQ-156) and prints its answer.
 *
 * The session token (draft-desktop A2) comes in the environment, never in the
 * arguments, where every process could read it: SPECGATE_STUDIO_TOKEN, the
 * shell's per-launch secret. The host answers nothing without it; the shell
 * loads the window with it. It is taken out of the environment at once, so no
 * terminal, build or agent the host starts inherits it. A sidecar that joins
 * another process's host prints the token that host issued for this window.
 */

/** Where the shell puts the window's session token. */
export const TOKEN_ENV = "SPECGATE_STUDIO_TOKEN";

/** The token the shell gave, taken out of the environment. */
export function takeToken(env: NodeJS.ProcessEnv = process.env): string {
  const token = env[TOKEN_ENV] ?? "";
  delete env[TOKEN_ENV];
  if (token.length < 32)
    throw new Error(`the shell gives the sidecar its session token in ${TOKEN_ENV}`);
  return token;
}

export interface Ready {
  type: "ready";
  /** The host's address, without a token. */
  url: string;
  /** Only when it joined another process's host: the token that host issued for this window. */
  token?: string;
  key: string;
  projectDir: string;
  /** This sidecar started the host: closing the window ends it. */
  owned: boolean;
  recent: Array<{ path: string; name: string }>;
}

export interface Choose {
  type: "choose";
  recent: Array<{ path: string; name: string }>;
}

interface Args {
  command: "host" | "update-step";
  flags: Map<string, string>;
  exitWithStdin: boolean;
}

function parse(argv: string[]): Args {
  const command = argv[0] === "update-step" ? "update-step" : "host";
  const rest = command === "host" ? argv : argv.slice(1);
  const flags = new Map<string, string>();
  let exitWithStdin = false;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (a === "--exit-with-stdin") exitWithStdin = true;
    else if (a.startsWith("--") && i + 1 < rest.length) flags.set(a.slice(2), rest[++i]!);
    else throw new Error(`unknown argument ${a}`);
  }
  return { command, flags, exitWithStdin };
}

/** The UI shipped beside the bundled sidecar, else the one apps/ui built. */
function uiDir(given: string | undefined): string | undefined {
  if (given) return given;
  const here = path.dirname(fileURLToPath(import.meta.url));
  const bundled = path.join(here, "ui");
  return fs.existsSync(path.join(bundled, "index.html")) ? bundled : undefined;
}

/**
 * A window opened from the Dock or the Start menu does not get the PATH of
 * the Developer's shell: the tools specgate runs (npm, the agent) are read from
 * their login shell, in the background, so the window does not wait for it.
 */
function adoptLoginPath(): void {
  if (process.platform === "win32" || process.env.SPECGATE_STUDIO_LOGIN_PATH === "0") return;
  const shell = process.env.SHELL || "/bin/sh";
  const mark = "__SPECGATE_STUDIO_PATH__";
  const child = spawn(shell, ["-ilc", `printf '%s' "${mark}$PATH${mark}"`], {
    stdio: ["ignore", "pipe", "ignore"],
    detached: false,
  });
  let out = "";
  const timer = setTimeout(() => child.kill("SIGKILL"), 5_000);
  child.stdout.setEncoding("utf8").on("data", (c: string) => (out += c));
  child.on("error", () => clearTimeout(timer));
  child.on("close", () => {
    clearTimeout(timer);
    const found = out.split(mark)[1];
    if (!found) return;
    const parts = [...found.split(":"), ...(process.env.PATH ?? "").split(":")].filter(Boolean);
    process.env.PATH = [...new Set(parts)].join(":");
  });
}

async function recentProjects(home: string): Promise<Array<{ path: string; name: string }>> {
  const recent = new RecentProjects(new NodeStore(home), systemClock, caseInsensitivePaths());
  const all = await recent.list().catch(() => []);
  return all.filter((r) => fs.existsSync(r.path)).map((r) => ({ path: r.path, name: r.name }));
}

function say(line: Ready | Choose | Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(line) + "\n");
}

export async function runHost(args: Args): Promise<void> {
  const token = takeToken();
  const home = args.flags.get("home") ?? studioHome();
  const recent = await recentProjects(home);
  const projectDir = args.flags.get("project-dir") ?? recent[0]?.path;
  if (!projectDir) {
    say({ type: "choose", recent });
    return;
  }
  const ui = uiDir(args.flags.get("ui"));
  const served: Served | Joined = await serveOrJoin({
    projectDir: path.resolve(projectDir),
    port: 0,
    home,
    token,
    ...(ui ? { ui } : {}),
  });
  say({
    type: "ready",
    url: served.url.replace(/\?.*$/, ""),
    ...(served.joined ? { token: served.token } : {}),
    key: served.key,
    projectDir: path.resolve(projectDir),
    owned: !served.joined,
    recent: await recentProjects(home),
  });
  if (served.joined) return;
  adoptLoginPath();

  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    // The host ends its terminals and builds — every process it started — then this ends.
    const hard = setTimeout(() => process.exit(0), 5_000);
    hard.unref();
    void served.host.close().finally(() => process.exit(0));
  };
  for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"] as const) process.on(sig, stop);
  if (args.exitWithStdin) {
    // The shell holds this input open while it lives: its end — the window
    // closed, or the shell gone — ends the host.
    process.stdin.on("end", stop).on("close", stop).on("error", stop).resume();
  }
}

export async function runUpdateStep(args: Args): Promise<void> {
  const token = takeToken();
  const url = (args.flags.get("url") ?? "").replace(/^http/, "ws");
  const params: Record<string, string> = {};
  for (const k of ["phase", "from", "to", "reason"]) {
    const v = args.flags.get(k);
    if (v !== undefined) params[k] = v;
  }
  const ws = new WebSocket(url, { headers: { authorization: `Bearer ${token}` } });
  const answer = await new Promise<unknown>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("the host did not answer")), 5_000);
    ws.once("error", reject);
    ws.once("open", () =>
      ws.send(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "update.step", params })),
    );
    ws.on("message", (raw) => {
      const m = JSON.parse(String(raw)) as { id?: unknown; result?: unknown; error?: unknown };
      if (m.id !== 1) return;
      clearTimeout(timer);
      if (m.error) reject(new Error((m.error as { message?: string }).message ?? "refused"));
      else resolve(m.result);
    });
  });
  ws.close();
  say(answer as Record<string, unknown>);
}

export async function main(argv: string[]): Promise<void> {
  const args = parse(argv);
  if (args.command === "update-step") await runUpdateStep(args);
  else await runHost(args);
}
