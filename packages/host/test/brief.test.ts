/**
 * draft-brief over JSON-RPC, on fakes: saving `docs/brief.md` runs the
 * brief's checks and Problems is told what they found (REQ-072); "Draft the
 * modules" drafts each module not drafted yet with the project's agent, one
 * at a time (REQ-073).
 */
import test from "node:test";
import assert from "node:assert/strict";
import type { Finding, ProcessRunner, SectionReader, SpecgateAnswer } from "@specgate-studio/core";
import { startHost } from "../src/index.js";
import { client } from "./rpc.js";

const PROJECT = "/tmp/sprich";

const B6: Finding = {
  severity: "warning",
  code: "B6_unmeasured",
  message: '"Shipping is free above some amount." promises a quantity and states no number.',
  target: "pedidos",
  fix: 'Give the number and its unit: "within 2 seconds", "for 500 students at once".',
  line: 3,
  file: "docs/brief.md",
};

/** sprich (A1) on fakes; specgate's `--json` answers are functions of the files on disk. */
function sprich(answers: Record<string, (disk: Record<string, string>) => SpecgateAnswer> = {}) {
  const reader: SectionReader = { read: async () => ({}) };
  const runs: string[][] = [];
  const runner: ProcessRunner = { run: async (a) => (runs.push([...a]), 0) };
  const calls: string[] = [];
  const disk: Record<string, string> = {
    "docs/brief.md": "## Module: pedidos\n\nRules\n- Orders are kept.\n",
    "spec.md": "# spec\n",
  };
  const all: Record<string, (disk: Record<string, string>) => SpecgateAnswer> = {
    // The fake check: B6 while a rule promises "some amount".
    "propose --from-brief --check --brief docs/brief.md": (d) => ({
      data: { draft: { brief: "docs/brief.md", ready: true } },
      findings: /some amount/.test(d["docs/brief.md"] ?? "") ? [B6] : [],
      exitCode: 0,
    }),
    ...answers,
  };
  const specgate = {
    call: async (args: readonly string[]) => {
      calls.push(args.join(" "));
      const a = all[args.join(" ")];
      if (!a) throw new Error(`no answer for ${args.join(" ")}`);
      return a(disk);
    },
  };
  const files = {
    list: async () => Object.keys(disk),
    read: async (p: string) => disk[p] ?? "",
    write: async (p: string, text: string) => void (disk[p] = text),
  };
  return {
    runs,
    calls,
    disk,
    options: { projectDir: PROJECT, reader, runner, port: 0, files, brief: { specgate } },
  };
}

/** Waits for the `n`th notification of `method`. */
async function note(
  ui: { notes: Array<{ method: string; params: unknown }> },
  method: string,
  n = 1,
) {
  for (let i = 0; i < 200; i++) {
    const found = ui.notes.filter((m) => m.method === method);
    if (found.length >= n) return found[n - 1]!.params as any;
    await new Promise((ok) => setTimeout(ok, 10));
  }
  throw new Error(`no ${method} #${n}`);
}

test('REQ-072 SCN-213: docs/brief.md saved with "free above some amount" — the check runs, Problems is told B6_unmeasured at its line', async () => {
  const s = sprich();
  const host = await startHost(s.options);
  const ui = await client(host.url);
  try {
    assert.deepEqual((await ui.ask("problems.get")).result, []);
    const text = "## Module: pedidos\n\nRules\n- Shipping is free above some amount.\n";
    await ui.ask("file.write", { path: "docs/brief.md", text });
    const changed = await note(ui, "problems.changed");
    assert.deepEqual(changed.findings, [B6]);
    assert.deepEqual(s.calls, ["propose --from-brief --check --brief docs/brief.md"]);
    assert.deepEqual(s.runs, [], "the check's prose is never read: it runs with --json");
    assert.deepEqual((await ui.ask("problems.get")).result, [B6]);
    // The editor underlines it at its line, as the gate's findings (draft-editor REQ-043).
    const a = (await ui.ask<any>("file.annotations", { path: "docs/brief.md" })).result;
    assert.deepEqual(
      a.marks.map((m: any) => [m.line, m.code]),
      [[3, "B6_unmeasured"]],
    );
    // It is told as any run, with its notice.
    const ended = ui.notes.find(
      (n) => n.method === "command.event" && (n.params as any).type === "ended",
    )?.params as any;
    assert.match(ended.notice.en.ran, /checked the brief: what it found is in Problems/);
  } finally {
    ui.close();
    await host.close();
  }
});

test('REQ-072 SCN-214: rewritten as "free above 50 EUR" and saved — Problems is told the finding is gone', async () => {
  const s = sprich();
  const host = await startHost(s.options);
  const ui = await client(host.url);
  try {
    await ui.ask("file.write", {
      path: "docs/brief.md",
      text: "## Module: pedidos\n\nRules\n- Shipping is free above some amount.\n",
    });
    assert.equal((await note(ui, "problems.changed", 1)).findings.length, 1);
    await ui.ask("file.write", {
      path: "docs/brief.md",
      text: "## Module: pedidos\n\nRules\n- Shipping is free above 50 EUR.\n",
    });
    assert.deepEqual((await note(ui, "problems.changed", 2)).findings, []);
    assert.deepEqual((await ui.ask("problems.get")).result, []);
  } finally {
    ui.close();
    await host.close();
  }
});

test("REQ-072: saving another file checks nothing", async () => {
  const s = sprich();
  const host = await startHost(s.options);
  const ui = await client(host.url);
  try {
    await ui.ask("file.write", { path: "spec.md", text: "# spec, edited\n" });
    await new Promise((ok) => setTimeout(ok, 50));
    assert.deepEqual(s.calls, []);
    assert.equal(ui.notes.filter((n) => n.method === "problems.changed").length, 0);
  } finally {
    ui.close();
    await host.close();
  }
});

const DRAFT_ANSWERS = (agent: string | null) => ({
  "config list": () => ({
    data: { config: agent ? { agent } : {} },
    findings: [],
    exitCode: 0,
  }),
  "propose --from-brief": () => ({
    data: {
      draft: {
        brief: "docs/brief.md",
        modules: [
          { module: "pedidos", change: "draft-pedidos", findings: 0, state: "not started" },
          { module: "pagos", change: "draft-pagos", findings: 0, state: "not started" },
        ],
      },
    },
    findings: [],
    exitCode: 0,
  }),
});

const drafted = (module: string): SpecgateAnswer => ({
  data: { draft: { module, change: `draft-${module}`, state: "ready" } },
  findings: [],
  exitCode: 0,
});

test("REQ-073 SCN-215: brief.draft — pedidos then pagos with the project's agent, each told as a run with its notice", async () => {
  const s = sprich({
    ...DRAFT_ANSWERS("claude -p"),
    "propose --from-brief pedidos --agent claude -p": () => drafted("pedidos"),
    "propose --from-brief pagos --agent claude -p": () => drafted("pagos"),
  });
  const host = await startHost(s.options);
  const ui = await client(host.url);
  try {
    const view = (await ui.ask<any>("brief.get")).result;
    assert.equal(view.agent, "claude -p");
    assert.deepEqual(
      view.modules.map((m: any) => [m.module, m.drafted]),
      [
        ["pedidos", false],
        ["pagos", false],
      ],
    );
    s.calls.length = 0;
    const r = await ui.ask<any>("brief.draft");
    assert.deepEqual(r.result, { ok: true, drafted: ["pedidos", "pagos"] });
    assert.deepEqual(s.calls, [
      "config list",
      "propose --from-brief",
      "propose --from-brief pedidos --agent claude -p",
      "propose --from-brief pagos --agent claude -p",
    ]);
    const events = ui.notes.filter((n) => n.method === "command.event").map((n) => n.params as any);
    assert.deepEqual(
      events.filter((e) => e.type !== "output").map((e) => [e.type, e.command ?? e.run]),
      [
        ["started", "specgate propose --from-brief pedidos --agent 'claude -p'"],
        ["ended", 1],
        ["started", "specgate propose --from-brief pagos --agent 'claude -p'"],
        ["ended", 2],
      ],
    );
    assert.deepEqual(s.runs, [], "run with --json: specgate's prose is never read");
  } finally {
    ui.close();
    await host.close();
  }
});

test("REQ-073 SCN-217: brief.draft with no agent — nothing runs; the notice names `specgate agents init --tool claude`", async () => {
  const s = sprich(DRAFT_ANSWERS(null));
  const host = await startHost(s.options);
  const ui = await client(host.url);
  try {
    const r = (await ui.ask<any>("brief.draft")).result;
    assert.equal(r.ok, false);
    assert.equal(r.code, "no_agent");
    assert.equal(r.notice.en.next, "specgate agents init --tool claude");
    assert.deepEqual(s.calls, ["config list"]);
    assert.equal(ui.notes.filter((n) => n.method === "command.event").length, 0);
  } finally {
    ui.close();
    await host.close();
  }
});

test("REQ-073: command.run never drafts a module with an agent the wire names (A6)", async () => {
  const s = sprich(DRAFT_ANSWERS("claude -p"));
  const host = await startHost(s.options);
  const ui = await client(host.url);
  try {
    const r = (
      await ui.ask<any>("command.run", {
        name: "draft-module",
        module: "pedidos",
        agent: "sh -c x",
      })
    ).result;
    assert.equal(r.ok, false);
    assert.equal(r.code, "command_unknown");
    assert.deepEqual(s.calls, []);
    assert.deepEqual(s.runs, []);
    // Its "?" names the agent, quoted as one argument.
    const h = (
      await ui.ask<any>("help.explain", {
        action: "draft-modules",
        lang: "en",
        vars: { module: "pedidos", agent: "claude -p" },
      })
    ).result;
    assert.equal(
      h.explanation.command,
      "specgate propose --from-brief pedidos --agent 'claude -p'",
    );
  } finally {
    ui.close();
    await host.close();
  }
});
