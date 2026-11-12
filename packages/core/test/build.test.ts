/**
 * draft-build-live in the core: Build lists what is ready, its estimate and
 * who codes (REQ-101) — every value read from specgate's `--json` answers:
 * `status`, `change show`, `harness report` and `config list`.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  Builds,
  agentProgram,
  buildList,
  commandLine,
  estimateOf,
  type SpecgateAnswer,
} from "../src/index.js";
import { REPORT, SPRICH_STATUS } from "./sprich-build.js";

test("REQ-101 SCN-301: REQ-030 ready with its estimate and `claude`; REQ-031 apart, waiting for Q2", () => {
  const list = buildList(SPRICH_STATUS, new Set(), REPORT, { agent: "claude -p < {prompt_file}" });
  assert.deepEqual(
    list.ready.map((r) => r.id),
    ["REQ-030", "REQ-032"],
  );
  assert.deepEqual(list.ready[0], {
    id: "REQ-030",
    title: "Cancel an order",
    change: "draft-pedidos",
  });
  assert.deepEqual(list.waiting, [
    {
      id: "REQ-031",
      title: "Cancel until dispatch",
      change: "draft-pedidos",
      why: "question",
      question: "Q2",
    },
  ]);
  assert.deepEqual(list.estimate, { minutes: 12, cost: 0.4, runs: 3 });
  assert.equal(list.agent, "claude");
  assert.equal(list.agentCommand, "claude -p < {prompt_file}");
});

test("REQ-101 SCN-302: no agent set — none named, and the command that sets one", () => {
  const list = buildList(SPRICH_STATUS, new Set(), REPORT, {});
  assert.equal(list.agent, null);
  assert.equal(list.setAgent, "specgate agents init --tool claude");
  assert.deepEqual(
    list.ready.map((r) => r.id),
    ["REQ-030", "REQ-032"],
  );
});

test("REQ-101: a draft no person approved, and a requirement without its scenario, wait apart with why", () => {
  const status = {
    requirements: [
      ...SPRICH_STATUS.requirements,
      { id: "REQ-940", title: "Coupons", category: "NEEDS_EVERYTHING", change: "draft-cupones" },
      { id: "REQ-941", title: "No scenario", category: "NEEDS_FEATURE", needs: "its scenario" },
    ],
  };
  const list = buildList(status, new Set(["draft-cupones"]), null, {});
  assert.deepEqual(
    list.waiting.map((w) => [w.id, w.why]),
    [
      ["REQ-031", "question"],
      ["REQ-940", "review"],
      ["REQ-941", "scenario"],
    ],
  );
  assert.equal(list.estimate, null, "no report, no estimate");
});

test("REQ-101: the estimate is specgate's — none before any build ran", () => {
  assert.deepEqual(estimateOf({ report: { runs: 0, passed: 0, msPerDelivered: null } }), {
    minutes: null,
    cost: null,
    runs: 0,
  });
  assert.deepEqual(estimateOf({ report: { runs: 2, passed: 2, msPerDelivered: 20_000 } }), {
    minutes: 1,
    cost: null,
    runs: 2,
  });
  assert.equal(estimateOf("prose"), null);
});

test("REQ-101: who codes is the program of the agent's command, on any platform", () => {
  assert.equal(agentProgram("claude -p < {prompt_file}"), "claude");
  assert.equal(agentProgram("C:\\tools\\codex.cmd exec {prompt_file}"), "codex");
  assert.equal(agentProgram("/usr/local/bin/gemini -p {prompt_file}"), "gemini");
  assert.equal(agentProgram("  "), null);
});

test("REQ-101: Build reads `harness report` and `config list` with --json, both reads", () => {
  assert.deepEqual(commandLine({ name: "harness-report" }), {
    args: ["harness", "report"],
    write: false,
    json: true,
  });
  assert.deepEqual(commandLine({ name: "config-list" }), {
    args: ["config", "list"],
    write: false,
    json: true,
  });
});

test("REQ-101 SCN-301: Builds.list reads status, the drafts to review, the report and the agent", async () => {
  const calls: string[] = [];
  const answers: Record<string, SpecgateAnswer> = {
    "harness report": { data: REPORT, findings: [], exitCode: 0 },
    "config list": {
      data: { config: { agent: "claude -p < {prompt_file}" } },
      findings: [],
      exitCode: 0,
    },
    "change show draft-pedidos": {
      data: {
        change: { id: "draft-pedidos", config: { brief: "docs/brief.md", approved: "2026-11-10" } },
      },
      findings: [],
      exitCode: 0,
    },
  };
  const builds = new Builds({
    specgate: {
      call: async (args) => {
        calls.push(args.join(" "));
        const a = answers[args.join(" ")];
        if (!a) throw new Error(`no answer for ${args.join(" ")}`);
        return a;
      },
    },
    sections: {
      section: async (s) =>
        s === "home"
          ? SPRICH_STATUS
          : s === "changes"
            ? { changes: [{ id: "draft-pedidos" }] }
            : {},
    },
  });
  const list = await builds.list();
  assert.deepEqual(
    list.ready.map((r) => r.id),
    ["REQ-030", "REQ-032"],
  );
  assert.equal(list.agent, "claude");
  assert.equal(list.estimate?.minutes, 12);
  assert.deepEqual(calls.sort(), ["change show draft-pedidos", "config list", "harness report"]);
});

test("REQ-101: a report or config specgate cannot give leaves the list, without estimate or agent", async () => {
  const builds = new Builds({
    specgate: { call: async () => Promise.reject(new Error("not JSON")) },
    sections: { section: async (s) => (s === "home" ? SPRICH_STATUS : { changes: [] }) },
  });
  const list = await builds.list();
  assert.equal(list.ready.length, 2);
  assert.equal(list.estimate, null);
  assert.equal(list.agent, null);
});

test("REQ-101: a requirement an open question blocks waits, though status does not say so", () => {
  // Found by the design audit: `status --json` lists REQ-002 as NEEDS_EVERYTHING
  // while Q1 of add-login blocks it; Build listed it as ready.
  const status = {
    requirements: [
      { id: "REQ-001", title: "Sign in", category: "NEEDS_EVERYTHING", change: "add-login" },
      {
        id: "REQ-002",
        title: "Lock the account",
        category: "NEEDS_EVERYTHING",
        change: "add-login",
      },
    ],
  };
  const questions = {
    questions: { open: [{ id: "Q1", change: "add-login", blocks: ["REQ-002"] }], answered: [] },
  };
  const list = buildList(status, new Set(), null, {}, questions);
  assert.deepEqual(
    list.ready.map((r) => r.id),
    ["REQ-001"],
  );
  assert.deepEqual(list.waiting, [
    {
      id: "REQ-002",
      title: "Lock the account",
      change: "add-login",
      why: "question",
      question: "Q1",
    },
  ]);
});

test("REQ-101: a change no person approved waits for its review, drafted from a brief or not", async () => {
  const status = {
    requirements: [
      { id: "REQ-001", title: "Sign in", category: "NEEDS_EVERYTHING", change: "add-login" },
      {
        id: "REQ-030",
        title: "Cancel an order",
        category: "NEEDS_EVERYTHING",
        change: "draft-pedidos",
      },
    ],
  };
  const answers: Record<string, SpecgateAnswer> = {
    "harness report": { data: null, findings: [], exitCode: 0 },
    "config list": { data: { config: {} }, findings: [], exitCode: 0 },
    "change show add-login": {
      data: { change: { id: "add-login", config: {} } },
      findings: [],
      exitCode: 0,
    },
    "change show draft-pedidos": {
      data: { change: { id: "draft-pedidos", config: { approved: "2026-11-10" } } },
      findings: [],
      exitCode: 0,
    },
  };
  const builds = new Builds({
    specgate: {
      call: async (args) => {
        const a = answers[args.join(" ")];
        if (!a) throw new Error(`no answer for ${args.join(" ")}`);
        return a;
      },
    },
    sections: {
      section: async (s) =>
        s === "home"
          ? status
          : s === "changes"
            ? { changes: [{ id: "add-login" }, { id: "draft-pedidos" }] }
            : { questions: { open: [], answered: [] } },
    },
  });
  const list = await builds.list();
  assert.deepEqual(
    list.ready.map((r) => r.id),
    ["REQ-030"],
  );
  assert.deepEqual(
    list.waiting.map((w) => [w.id, w.why]),
    [["REQ-001", "review"]],
  );
});

test("REQ-101: the agent's own question, asked while it builds, is answered in Live and does not take the requirement out", () => {
  const status = {
    requirements: [{ id: "REQ-030", title: "Cancel", category: "NEEDS_EVERYTHING" }],
  };
  const questions = { questions: { open: [{ id: "Q3", blocks: ["REQ-030"], asked: "build" }] } };
  assert.deepEqual(
    buildList(status, new Set(), null, {}, questions).ready.map((r) => r.id),
    ["REQ-030"],
  );
});
