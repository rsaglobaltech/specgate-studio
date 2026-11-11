/**
 * A real specgate project for Build and Live's tests (draft-build-live): made
 * by `specgate init`, committed, its agent a fake — a Node script that writes
 * harness events as Claude Code's adapter would and never calls a paid agent.
 * What the fake does is chosen by `FAKE_AGENT` in a file beside it.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { NodeGit } from "@specgate-studio/adapter-node";
import { SpecgateCli, specgateBin } from "@specgate-studio/adapter-specgate-cli";
import { NodeBuildRunner, NodeProcessRunner, startHost } from "../src/index.js";
import { client } from "./rpc.js";

const CONFIG = `PROJECT_NAME: Sprich
PROJECT_SLUG: sprich
PROJECT_TYPE: backend
DOMAIN: general
STACK: Node.js, TypeScript
API_STYLE: REST with DTO boundaries
TESTING: node --test
`;

/**
 * The fake agent. `pass` writes the test that names its requirement; `ask`
 * asks with `specgate ask` instead of guessing; `slow` starts a child that
 * would run for a minute — a test server — writes both pids, and waits.
 */
const AGENT = String.raw`
const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const here = __dirname;
const mode = fs.readFileSync(path.join(here, "mode.txt"), "utf8").trim();
const file = process.env.AGENT_EVENTS_FILE;
const req = process.env.AGENT_EVENTS_REQ;
const attempt = Number(process.env.AGENT_EVENTS_ATTEMPT) || 1;
const ev = (e) => file && fs.appendFileSync(file, JSON.stringify({ t: Math.floor(Date.now() / 1000), req, attempt, ...e }) + "\n");
ev({ type: "agent", model: "fake-model" });
ev({ type: "message", text: "Reading the scenario of " + req });
const t0 = Date.now() / 1000;
if (mode === "ask") {
  const r = spawnSync(process.execPath, [process.env.SPECGATE_BIN, "ask", req, "Round to the cent or to the nearest 5 cents?"], { encoding: "utf8" });
  ev({ type: "usage", final: true, input: 900, output: 120, cacheRead: 0, cacheWrite: 0, cost: 0.05, turns: 2 });
  process.exit(r.status === 0 ? 0 : 1);
}
fs.mkdirSync("test", { recursive: true });
fs.writeFileSync(path.join("test", "health.test.js"), "// " + req + ": the health check answers\n");
ev({ type: "step", kind: "write", tool: "Write", target: "test/health.test.js", started: t0, ended: t0 + 1.5, result: "ok", added: 1 });
ev({ type: "usage", final: true, input: 1200, output: 300, cacheRead: 0, cacheWrite: 0, cost: 0.12, turns: 3 });
if (mode === "slow") {
  const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { stdio: "ignore" });
  fs.writeFileSync(path.join(here, "pids.txt"), process.pid + " " + child.pid + "\n");
  ev({ type: "message", text: "Running the tests" });
  setTimeout(() => process.exit(0), 60000);
} else {
  console.log("done");
}
`;

export interface HarnessProject {
  parent: string;
  dir: string;
  /** What the fake agent does next. */
  mode(m: "pass" | "ask" | "slow"): void;
  /** The pids the slow agent wrote: itself and its child. */
  pids(): number[];
}

function specgate(dir: string, ...args: string[]) {
  const r = spawnSync(process.execPath, [specgateBin(), ...args], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", CI: "1" },
  });
  assert.equal(r.status, 0, `specgate ${args.join(" ")}: ${r.stdout}${r.stderr}`);
  return r.stdout;
}

function git(dir: string, ...args: string[]) {
  const r = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
}

/** sprich, made by `specgate init`, REQ-000 ready, the fake agent set, committed on main. */
export function harnessProject(): HarnessProject {
  const parent = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "sg-build-")));
  fs.writeFileSync(path.join(parent, "project.yaml"), CONFIG);
  specgate(
    parent,
    "init",
    "--config",
    path.join(parent, "project.yaml"),
    "--out",
    parent,
    "--no-git",
    "--no-agents",
    "--no-ci",
  );
  const dir = path.join(parent, "sprich");
  const agentDir = path.join(parent, "agent");
  fs.mkdirSync(agentDir);
  fs.writeFileSync(path.join(agentDir, "fake-agent.cjs"), AGENT);
  fs.writeFileSync(path.join(agentDir, "mode.txt"), "pass\n");
  const agent = path.join(agentDir, "fake-agent.cjs").split(path.sep).join("/");
  specgate(dir, "config", "set", "test_cmd", "node -e 0");
  fs.appendFileSync(
    path.join(dir, "harness.config.yaml"),
    `agent: 'node "${agent}" {prompt_file}'\nsetup_cmd: none\nmax_attempts: 1\n`,
  );
  git(dir, "init", "-q", "-b", "main");
  git(dir, "config", "user.name", "Dev");
  git(dir, "config", "user.email", "dev@example.com");
  git(dir, "config", "commit.gpgsign", "false");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "sprich");
  return {
    parent,
    dir,
    mode: (m) => fs.writeFileSync(path.join(agentDir, "mode.txt"), `${m}\n`),
    pids: () => {
      try {
        return fs
          .readFileSync(path.join(agentDir, "pids.txt"), "utf8")
          .trim()
          .split(/\s+/)
          .map(Number);
      } catch {
        return [];
      }
    },
  };
}

/** Removes a test folder; on Windows a process that just ended may hold it a moment. */
export async function remove(dir: string): Promise<void> {
  for (let i = 0; ; i++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return;
    } catch (e) {
      if (i >= 60) throw e;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

// The fake agent asks through the same specgate.
process.env.SPECGATE_BIN = specgateBin();

export async function realHost(dir: string) {
  const cli = new SpecgateCli({
    program: process.execPath,
    prefix: [specgateBin()],
    projectDir: dir,
  });
  const opts = { program: process.execPath, prefix: [specgateBin()], projectDir: dir };
  const host = await startHost({
    projectDir: dir,
    reader: cli,
    runner: new NodeProcessRunner(opts),
    port: 0,
    builds: { specgate: cli, git: new NodeGit(), harness: new NodeBuildRunner(opts) },
  });
  return { host, ui: await client(host.url) };
}

/** The notice of the run whose command is `command`, once it ended. */
export async function endedOf(
  ui: Awaited<ReturnType<typeof client>>,
  command: string,
  ms = 120_000,
): Promise<any> {
  const end = Date.now() + ms;
  for (;;) {
    const started = ui.notes.find(
      (n) =>
        n.method === "command.event" &&
        (n.params as any).type === "started" &&
        (n.params as any).command === command,
    );
    const run = (started?.params as any)?.run;
    const ended = ui.notes.find(
      (n) =>
        n.method === "command.event" &&
        (n.params as any).type === "ended" &&
        (n.params as any).run === run,
    );
    if (ended) return ended.params;
    if (Date.now() > end)
      throw new Error(`${command} did not end: ${JSON.stringify(ui.notes.slice(-5))}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}
