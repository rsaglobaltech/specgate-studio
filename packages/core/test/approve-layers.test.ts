/**
 * approve-layers — a person approves one layer of a specgate 1.0 change from
 * Changes (REQ-217): the command line, what comes over the wire, its notice
 * and its "?".
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  CHANGE_LAYERS,
  Commands,
  commandLine,
  explain,
  type CommandEvent,
  type ProcessRunner,
  type SpecgateAnswer,
  type SpecgateCommand,
} from "../src/index.js";

const noRunner: ProcessRunner = {
  run: async () => {
    throw new Error("the runner must not run a JSON command");
  },
};

function port(answers: Record<string, SpecgateAnswer>) {
  const calls: string[][] = [];
  return {
    calls,
    port: {
      call: async (args: readonly string[]) => {
        calls.push([...args]);
        const a = answers[args.join(" ")];
        if (!a) throw new Error(`no answer for ${args.join(" ")}`);
        return structuredClone(a);
      },
      version: async () => "1.0.0-rc.12",
    },
  };
}

test("REQ-217: Approve is `change approve <change> --layer <layer>`, a write run with --json, for the three layers only", () => {
  assert.deepEqual(CHANGE_LAYERS, ["discover", "design", "tasks"]);
  assert.deepEqual(
    commandLine({ name: "change-approve", change: "draft-pedidos", layer: "tasks" }),
    { args: ["change", "approve", "draft-pedidos", "--layer", "tasks"], write: true, json: true },
  );
  // From the wire, nothing else is trusted.
  const wire = (c: unknown) => commandLine(c as SpecgateCommand);
  assert.equal(wire({ name: "change-approve", change: "draft-pedidos", layer: "all" }), null);
  assert.equal(wire({ name: "change-approve", change: "draft-pedidos" }), null);
  assert.equal(wire({ name: "change-approve", change: "--force", layer: "tasks" }), null);
  assert.equal(wire({ name: "change-approve", change: "../x", layer: "tasks" }), null);
});

test("REQ-217 SCN-971: Approve tasks of draft-pedidos — the notice says it approved the layer and names approvals.json", async () => {
  const fake = port({
    "change approve draft-pedidos --layer tasks": {
      data: {
        approve: {
          ok: true,
          change: "draft-pedidos",
          approved: "2026-11-15",
          layers: ["tasks"],
          pending: [],
        },
      },
      findings: [],
      exitCode: 0,
    },
  });
  const commands = new Commands(noRunner, { json: fake.port });
  const events: CommandEvent[] = [];
  commands.onEvent((e) => events.push(e));
  const r = await commands.run({ name: "change-approve", change: "draft-pedidos", layer: "tasks" });
  assert.ok(r.ok);
  assert.equal(r.exitCode, 0);
  assert.deepEqual(r.written, ["docs/specs/changes/draft-pedidos/approvals.json"]);
  const ended = events.at(-1);
  assert.ok(ended?.type === "ended" && ended.notice);
  assert.equal(ended.notice.en.tone, "ok");
  assert.match(ended.notice.en.ran, /approved the tasks layer of draft-pedidos/);
  assert.match(ended.notice.es.ran, /aprobó la capa tasks de draft-pedidos/);
  assert.match(ended.notice.en.wrote, /approvals\.json/);
});

test("REQ-217 SCN-972: a layer not written yet — refused with specgate's finding and its fix; nothing written", async () => {
  const fake = port({
    "change approve draft-pedidos --layer design": {
      data: { approve: null },
      findings: [
        {
          severity: "error",
          code: "approve_layer_missing",
          message:
            "draft-pedidos has no design.md written yet: there is nothing of the design to approve.",
          target: "draft-pedidos",
          fix: "Write design.md, then approve it.",
        },
      ],
      exitCode: 1,
    },
  });
  const commands = new Commands(noRunner, { json: fake.port });
  const events: CommandEvent[] = [];
  commands.onEvent((e) => events.push(e));
  const r = await commands.run({
    name: "change-approve",
    change: "draft-pedidos",
    layer: "design",
  });
  assert.ok(r.ok);
  assert.equal(r.exitCode, 1);
  assert.deepEqual(r.written, []);
  const ended = events.at(-1);
  assert.ok(ended?.type === "ended" && ended.notice);
  assert.equal(ended.notice.en.tone, "refused");
  assert.match(ended.notice.en.ran, /approve_layer_missing/);
  assert.equal(ended.notice.en.fix, "Write design.md, then approve it.");
  assert.equal(ended.notice.en.wrote, "Nothing was written.");
});

test('REQ-217: the "?" beside Approve — what it does, its command, approvals.json, and that it builds nothing', () => {
  const en = explain("approve", "en", { change: "draft-pedidos", layer: "tasks" });
  assert.equal(en.command, "specgate change approve draft-pedidos --layer tasks");
  assert.match(en.files, /docs\/specs\/changes\/draft-pedidos\/approvals\.json/);
  assert.match(en.doesNot, /does not build, commit or push/);
  const es = explain("approve", "es", { change: "draft-pedidos", layer: "tasks" });
  assert.match(es.does, /Aprueba la capa tasks de draft-pedidos/);
});
