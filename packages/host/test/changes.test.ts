/**
 * draft-changes over JSON-RPC, on fakes: `changes.get` groups the changes
 * (REQ-081), `changes.ticket` reviews a ticket and runs nothing that writes
 * (REQ-084), and Apply's end event carries the notice made from specgate's
 * findings (REQ-086, help REQ-063).
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  InMemoryFileSystem,
  InMemoryGit,
  type ProcessRunner,
  type SectionReader,
  type SpecgateAnswer,
} from "@specgate-studio/core";
import { startHost } from "../src/index.js";
import { client } from "./rpc.js";

const PROJECT = "/tmp/sprich";

function sprich(branch: string | null = null) {
  const home = {
    total: 3,
    pending: 1,
    nextCommand: "specgate apply REQ-031",
    requirements: [
      { id: "REQ-030", title: "A coupon", category: "DONE", needs: null, change: "add-coupons" },
      {
        id: "REQ-031",
        title: "Once",
        category: "NEEDS_TEST",
        needs: "its test",
        change: "add-coupons",
      },
      { id: "REQ-040", title: "Round", category: "DONE", needs: null, change: "fix-rounding" },
    ],
  };
  const sections: Record<string, unknown> = {
    home,
    changes: { changes: [{ id: "add-coupons" }, { id: "fix-rounding" }] },
  };
  const reads: string[] = [];
  const reader: SectionReader = {
    read: async (s) => (reads.push(s), structuredClone(sections[s] ?? {})),
  };
  const runs: string[][] = [];
  const runner: ProcessRunner = { run: async (a) => (runs.push([...a]), 0) };
  const calls: string[][] = [];
  const answers: Record<string, SpecgateAnswer> = {
    "change show add-coupons": {
      data: {
        change: {
          id: "add-coupons",
          config: {},
          deltas: [
            {
              file: "docs/specs/changes/add-coupons/specs/coupons/spec.md",
              added: ["REQ-030 — A coupon", "REQ-031 — Once"],
              modified: [],
            },
          ],
        },
      },
      findings: [],
      exitCode: 0,
    },
    "change show fix-rounding": {
      data: { change: { id: "fix-rounding", config: {} } },
      findings: [],
      exitCode: 0,
    },
    "apply REQ-031": {
      data: { requirement: null },
      findings: [
        {
          severity: "error",
          code: "apply_no_test",
          message: "REQ-031 has no test that names it yet (TDD-1).",
          target: "REQ-031",
          fix: "write a test that names REQ-031 (and its scenario SCN-031), then run specgate apply REQ-031",
        },
      ],
      exitCode: 1,
    },
    "apply REQ-030": {
      data: { requirement: { id: "REQ-030", status: "Implemented", rowsUpdated: 1 } },
      findings: [],
      exitCode: 0,
    },
    "propose --from-ticket KAN-13 --check": {
      data: {
        ticket: {
          key: "KAN-13",
          summary: "Register a vehicle entry",
          type: "Story",
          criteria: ["Given a plate…"],
          questions: [],
        },
        ready: true,
        capability: "parking",
      },
      findings: [],
      exitCode: 0,
    },
  };
  const specgate = {
    call: async (args: readonly string[]) => {
      calls.push([...args]);
      const a = answers[args.join(" ")];
      if (!a) throw new Error(`no answer for ${args.join(" ")}`);
      return structuredClone(a);
    },
  };
  const git = new InMemoryGit({ [PROJECT]: { branch, uncommitted: [] } });
  return {
    reads,
    runs,
    calls,
    options: {
      projectDir: PROJECT,
      reader,
      runner,
      port: 0,
      changes: { specgate },
      workspace: { fs: new InMemoryFileSystem({ [`${PROJECT}/spec.md`]: "# spec\n" }), git },
    },
  };
}

test("REQ-081 SCN-241: changes.get — add-coupons in progress with REQ-031 to apply, fix-rounding ready to archive", async () => {
  const s = sprich();
  const host = await startHost(s.options);
  const ui = await client(host.url);
  try {
    const r = await ui.ask<any>("changes.get");
    assert.deepEqual(
      r.result.groups.progress.map((c: any) => [c.id, c.toApply]),
      [["add-coupons", ["REQ-031"]]],
    );
    assert.deepEqual(
      r.result.groups.ready.map((c: any) => c.id),
      ["fix-rounding"],
    );
    assert.deepEqual(r.result.groups.review, []);
    assert.deepEqual(s.runs, [], "reading Changes runs no command");
  } finally {
    ui.close();
    await host.close();
  }
});

test("REQ-084 SCN-247 SCN-248: changes.ticket on feature/parking/KAN-13 — the review, --no-branch, and nothing written or run", async () => {
  const s = sprich("feature/parking/KAN-13");
  const host = await startHost(s.options);
  const ui = await client(host.url);
  try {
    const r = await ui.ask<any>("changes.ticket", { key: "KAN-13" });
    assert.equal(r.result.ticket.summary, "Register a vehicle entry");
    assert.equal(r.result.onBranch, "feature/parking/KAN-13");
    assert.deepEqual(r.result.open.noPush, {
      name: "propose-ticket",
      key: "KAN-13",
      noBranch: true,
      noPush: true,
    });
    assert.deepEqual(s.calls, [["propose", "--from-ticket", "KAN-13", "--check"]]);
    assert.deepEqual(s.runs, []);
    const bad = await ui.ask("changes.ticket", { key: "--force" });
    assert.ok(bad.error, "a value that is not a key is refused");
    assert.equal(s.calls.length, 1);
  } finally {
    ui.close();
    await host.close();
  }
});

test("REQ-086 SCN-251 / REQ-063 SCN-186: Apply refused — the end event's notice from `apply --json`: apply_no_test, nothing written, the fix", async () => {
  const s = sprich();
  const host = await startHost(s.options);
  const ui = await client(host.url);
  try {
    const r = await ui.ask<any>("command.run", { name: "apply", req: "REQ-031" });
    assert.equal(r.result.exitCode, 1);
    assert.deepEqual(s.calls, [["apply", "REQ-031"]]);
    assert.deepEqual(s.runs, [], "the runner did not run it: its prose is never read");
    const ended = ui.notes.find(
      (n) => n.method === "command.event" && (n.params as any).type === "ended",
    )?.params as any;
    assert.equal(ended.notice.en.tone, "refused");
    assert.match(ended.notice.en.ran, /`specgate apply REQ-031` was refused with apply_no_test/);
    assert.equal(ended.notice.en.wrote, "Nothing was written.");
    assert.match(ended.notice.en.fix, /write a test that names REQ-031/);
  } finally {
    ui.close();
    await host.close();
  }
});

test("REQ-086 SCN-252: Apply passes — the notice names the delta; Home and Changes are read again", async () => {
  const s = sprich();
  const host = await startHost(s.options);
  const ui = await client(host.url);
  try {
    await ui.ask("project.open");
    const r = await ui.ask<any>("command.run", { name: "apply", req: "REQ-030" });
    assert.deepEqual(r.result.written, ["docs/specs/changes/add-coupons/specs/coupons/spec.md"]);
    const ended = ui.notes.find(
      (n) => n.method === "command.event" && (n.params as any).type === "ended",
    )?.params as any;
    assert.match(
      ended.notice.en.wrote,
      /docs\/specs\/changes\/add-coupons\/specs\/coupons\/spec\.md/,
    );
    assert.equal(ended.notice.en.next, "specgate status");
    const changed = ui.notes.find((n) => n.method === "state.changed")?.params as any;
    assert.ok(changed.sections.includes("home") && changed.sections.includes("changes"));
  } finally {
    ui.close();
    await host.close();
  }
});
