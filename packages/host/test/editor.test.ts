/**
 * draft-editor over JSON-RPC: saving writes that one file (REQ-045), and a
 * file's annotations — its findings and blocking questions — come from the
 * host, worked out by the core (REQ-043, REQ-044).
 */
import test from "node:test";
import assert from "node:assert/strict";
import WebSocket from "ws";
import type { ProcessRunner, SectionReader } from "@specgate-studio/core";
import { startHost, type ProjectFiles } from "../src/index.js";

const PATH = "docs/specs/changes/draft-pedidos/specs/pedidos/spec.md";

async function rpc(url: string) {
  const ws = new WebSocket(url);
  await new Promise((ok, ko) => ws.once("open", ok).once("error", ko));
  let id = 0;
  const pending = new Map<number, (m: any) => void>();
  ws.on("message", (raw) => {
    const m = JSON.parse(String(raw));
    pending.get(m.id)?.(m);
  });
  const ask = (method: string, params: unknown) =>
    new Promise<any>((ok) => {
      const n = ++id;
      pending.set(n, ok);
      ws.send(JSON.stringify({ jsonrpc: "2.0", id: n, method, params }));
    });
  return { ask, close: () => ws.close() };
}

function project() {
  const disk: Record<string, string> = {
    [PATH]:
      "### Requirement: REQ-031 — Cancel\n\nThe system SHALL let a customer cancel until it is shipped.\n",
    "docs/specs/changes/draft-pedidos/questions.md":
      "| # | Question | Blocks | Options seen |\n| --- | --- | --- | --- |\n| Q2 | Until when? | REQ-031 | until it is shipped; within 24 h |\n",
  };
  const writes: string[] = [];
  const files: ProjectFiles = {
    list: async () => Object.keys(disk),
    read: async (p) => {
      if (!(p in disk)) throw new Error(`no ${p}`);
      return disk[p]!;
    },
    write: async (p, text) => {
      writes.push(p);
      disk[p] = text;
    },
  };
  const reader: SectionReader = {
    read: async (s) =>
      s === "questions"
        ? {
            questions: {
              open: [
                { id: "Q2", change: "draft-pedidos", text: "Until when?", blocks: ["REQ-031"] },
              ],
            },
          }
        : {},
  };
  const runs: string[][] = [];
  const runner: ProcessRunner = { run: async (a) => (runs.push([...a]), 0) };
  const findings = async () => [
    {
      severity: "error" as const,
      code: "D6_unlisted_value",
      message: "24 h is not in the brief.",
      fix: "Use the brief's value.",
      file: PATH,
      line: 3,
    },
  ];
  return { disk, writes, files, reader, runner, runs, findings };
}

test("REQ-045 SCN-129: saving writes that one file and runs no specgate command", async () => {
  const p = project();
  const host = await startHost({
    projectDir: "/tmp/sprich",
    reader: p.reader,
    runner: p.runner,
    files: p.files,
    port: 0,
  });
  const ui = await rpc(host.url);
  try {
    const r = await ui.ask("file.write", { path: PATH, text: "edited\n" });
    assert.deepEqual(r.result, { path: PATH });
    assert.deepEqual(p.writes, [PATH]);
    assert.equal(p.disk[PATH], "edited\n");
    assert.deepEqual(p.runs, []);
    for (const bad of ["../x", "/etc/hosts", "a/../../b"]) {
      assert.equal((await ui.ask("file.write", { path: bad, text: "x" })).error?.code, -32602);
    }
    assert.equal(
      (await ui.ask("file.write", { path: PATH })).error?.code,
      -32602,
      "text is required",
    );
    assert.deepEqual(p.writes, [PATH], "a refused write writes nothing");
  } finally {
    ui.close();
    await host.close();
  }
});

test("REQ-043 SCN-125 SCN-126, REQ-044 SCN-127: the file's annotations — the gate finding at its line, Q2 at its words and under REQ-031 with its options", async () => {
  const p = project();
  const host = await startHost({
    projectDir: "/tmp/sprich",
    reader: p.reader,
    runner: p.runner,
    files: p.files,
    findings: p.findings,
    port: 0,
  });
  const ui = await rpc(host.url);
  try {
    await ui.ask("project.open", {});
    const a = (await ui.ask("file.annotations", { path: PATH })).result;
    assert.deepEqual(
      a.marks.map((m: any) => [m.code, m.line]),
      [
        ["D6_unlisted_value", 3],
        ["question_open", 3],
      ],
    );
    assert.deepEqual(a.questions, [
      {
        id: "Q2",
        change: "draft-pedidos",
        text: "Until when?",
        options: ["until it is shipped", "within 24 h"],
        req: "REQ-031",
        afterLine: 1,
      },
    ]);
    assert.deepEqual(p.runs, [], "annotations run no command");
    // Unsaved text: the actions follow the edit before it is saved.
    const unsaved = (
      await ui.ask("file.annotations", {
        path: PATH,
        text: "\n\n### Requirement: REQ-031 — Cancel\n",
      })
    ).result;
    assert.deepEqual(unsaved.headings, [{ req: "REQ-031", line: 3 }]);
    assert.deepEqual(p.writes, [], "annotating writes nothing");
  } finally {
    ui.close();
    await host.close();
  }
});

test("REQ-044 SCN-128: after `specgate answer`, Questions is read again and every UI is told", async () => {
  const p = project();
  let open = [{ id: "Q2", change: "draft-pedidos", text: "Until when?", blocks: ["REQ-031"] }];
  const reader = {
    read: async (s: string) => (s === "questions" ? { questions: { open } } : {}),
  } as never;
  const runner: ProcessRunner = { run: async () => ((open = []), 0) };
  const host = await startHost({
    projectDir: "/tmp/sprich",
    reader,
    runner,
    files: p.files,
    port: 0,
  });
  const ui = await rpc(host.url);
  try {
    await ui.ask("project.open", {});
    await ui.ask("command.run", {
      name: "answer",
      q: "Q2",
      answer: "until it is shipped",
      change: "draft-pedidos",
    });
    const a = (await ui.ask("file.annotations", { path: PATH })).result;
    assert.deepEqual(a.questions, [], "Q2 no longer shows under REQ-031");
  } finally {
    ui.close();
    await host.close();
  }
});
