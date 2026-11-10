/**
 * draft-specgate-port — the in-process adapter (REQ-014): the sections
 * specgate's API answers are read with no process, the rest by the CLI
 * adapter; it passes the same contract as every adapter (REQ-015).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as fs from "node:fs";
import * as path from "node:path";
import { SPECGATE_CONTRACT, type SpecgatePort } from "@specgate-studio/core";
import { SpecgateCli, specgateBin } from "@specgate-studio/adapter-specgate-cli";
import { shop } from "@specgate-studio/adapter-specgate-cli/testing";
import { inProcessSpecgate } from "../src/index.js";

const cli = (dir: string) =>
  new SpecgateCli({ program: process.execPath, prefix: [specgateBin()], projectDir: dir });

/** Runs `read` with every way of starting a process made to throw, but `git ls-files`. */
async function withoutProcesses<T>(read: () => Promise<T>): Promise<T> {
  const mod = createRequire(import.meta.url)("node:child_process") as Record<string, unknown>;
  const names = ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"];
  const saved = names.map((n) => mod[n]);
  names.forEach((n, i) => {
    mod[n] = (command: string, args: readonly string[] = [], ...rest: unknown[]) => {
      if (n === "spawnSync" && command === "git" && args[0] === "ls-files") {
        return (saved[i] as (...a: unknown[]) => unknown)(command, args, ...rest);
      }
      throw new Error(`a process was started: ${n} ${command} ${args.join(" ")}`);
    };
  });
  try {
    return await read();
  } finally {
    names.forEach((n, i) => (mod[n] = saved[i]));
  }
}

/** A CLI adapter that records what it was asked. */
function recording(port: SpecgatePort) {
  const asked: string[] = [];
  const wrapped: SpecgatePort = {
    version: () => port.version(),
    read: (s) => (asked.push(`read ${s}`), port.read(s)),
    call: (a) => (asked.push(`call ${a.join(" ")}`), port.call(a)),
  };
  return { wrapped, asked };
}

const cleanup = (dir: string) => fs.rmSync(path.dirname(dir), { recursive: true, force: true });

test("REQ-014 SCN-037: Home is read in process — the same data as the CLI, and no specgate process started", async () => {
  const dir = shop();
  try {
    const { wrapped, asked } = recording(cli(dir));
    const port = await inProcessSpecgate(wrapped, dir);
    assert.ok(port, "specgate publishes its API");
    const home = await withoutProcesses(() => port.read("home"));
    assert.deepEqual(home, await cli(dir).read("home"));
    assert.deepEqual(asked, [], "the CLI adapter was not asked");
  } finally {
    cleanup(dir);
  }
});

test("REQ-014 SCN-038: Report, which the API does not offer, is read by the CLI adapter with `specgate report --json`", async () => {
  const dir = shop();
  try {
    const { wrapped, asked } = recording(cli(dir));
    const port = (await inProcessSpecgate(wrapped, dir))!;
    const report = (await port.read("report")) as { total?: number };
    assert.equal(typeof report.total, "number");
    assert.deepEqual(asked, ["read report"]);
  } finally {
    cleanup(dir);
  }
});

test("REQ-014: the version is the installed specgate's, read without a process", async () => {
  const dir = shop();
  try {
    const port = (await inProcessSpecgate(cli(dir), dir))!;
    assert.equal(await withoutProcesses(() => port.version()), await cli(dir).version());
  } finally {
    cleanup(dir);
  }
});

for (const check of SPECGATE_CONTRACT) {
  test(`REQ-015: the in-process adapter — ${check.name}`, async () => {
    const dir = shop();
    try {
      await check.run((await inProcessSpecgate(cli(dir), dir))!);
    } finally {
      cleanup(dir);
    }
  });
}
