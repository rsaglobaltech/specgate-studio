/**
 * draft-build-live over JSON-RPC, on fakes: `build.get` lists what is ready,
 * its estimate and who codes (REQ-101), reading specgate's `--json` only.
 */
import test from "node:test";
import assert from "node:assert/strict";
import type { ProcessRunner, SectionReader, SpecgateAnswer } from "@specgate-studio/core";
import { startHost } from "../src/index.js";
import { client } from "./rpc.js";

const PROJECT = "/tmp/sprich";

export const STATUS = {
  total: 3,
  pending: 2,
  nextCommand: "specgate apply REQ-030",
  requirements: [
    {
      id: "REQ-030",
      title: "Cancel an order",
      category: "NEEDS_EVERYTHING",
      needs: "a test and code",
      change: "draft-pedidos",
    },
    {
      id: "REQ-031",
      title: "Cancel until dispatch",
      category: "WAITING_FOR_ANSWER",
      change: "draft-pedidos",
      question: "Q2",
    },
  ],
};

export function answers(agent: string | null): Record<string, SpecgateAnswer> {
  return {
    "harness report": {
      data: { report: { runs: 1, passed: 1, msPerDelivered: 300_000 } },
      findings: [],
      exitCode: 0,
    },
    "config list": { data: { config: agent ? { agent } : {} }, findings: [], exitCode: 0 },
    "change show draft-pedidos": {
      data: { change: { id: "draft-pedidos", config: { brief: "docs/brief.md", approved: "x" } } },
      findings: [],
      exitCode: 0,
    },
  };
}

export function sprich(agent: string | null = "claude -p < {prompt_file}") {
  const sections: Record<string, unknown> = {
    home: STATUS,
    changes: { changes: [{ id: "draft-pedidos" }] },
    questions: { questions: { open: [] } },
  };
  const reader: SectionReader = { read: async (s) => structuredClone(sections[s] ?? {}) };
  const runs: string[][] = [];
  const runner: ProcessRunner = { run: async (a) => (runs.push([...a]), 0) };
  const calls: string[] = [];
  const recorded = answers(agent);
  const specgate = {
    call: async (args: readonly string[]) => {
      calls.push(args.join(" "));
      const a = recorded[args.join(" ")];
      if (!a) throw new Error(`no answer for ${args.join(" ")}`);
      return structuredClone(a);
    },
  };
  return { reader, runner, runs, calls, specgate, sections };
}

test("REQ-101 SCN-301: build.get — REQ-030 ready with specgate's estimate and `claude`, REQ-031 waiting for Q2", async () => {
  const s = sprich();
  const host = await startHost({
    projectDir: PROJECT,
    reader: s.reader,
    runner: s.runner,
    port: 0,
    builds: { specgate: s.specgate },
  });
  const ui = await client(host.url);
  try {
    const { result } = await ui.ask<{
      ready: Array<{ id: string }>;
      waiting: Array<{ id: string; why: string; question: string }>;
      estimate: { minutes: number };
      agent: string;
    }>("build.get");
    assert.deepEqual(
      result!.ready.map((r) => r.id),
      ["REQ-030"],
    );
    assert.deepEqual(
      result!.waiting.map((w) => [w.id, w.why, w.question]),
      [["REQ-031", "question", "Q2"]],
    );
    assert.equal(result!.estimate.minutes, 5);
    assert.equal(result!.agent, "claude");
    assert.deepEqual(s.runs, [], "nothing runs");
  } finally {
    ui.close();
    await host.close();
  }
});

test("REQ-101 SCN-302: build.get with no agent set names `specgate agents init --tool claude`", async () => {
  const s = sprich(null);
  const host = await startHost({
    projectDir: PROJECT,
    reader: s.reader,
    runner: s.runner,
    port: 0,
    builds: { specgate: s.specgate },
  });
  const ui = await client(host.url);
  try {
    const { result } = await ui.ask<{ agent: string | null; setAgent: string }>("build.get");
    assert.equal(result!.agent, null);
    assert.equal(result!.setAgent, "specgate agents init --tool claude");
  } finally {
    ui.close();
    await host.close();
  }
});
