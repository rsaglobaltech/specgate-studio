/**
 * The core host over JSON-RPC on a WebSocket (REQ-001), answering a section in
 * under 50 ms once read (REQ-004).
 */
import test from "node:test";
import assert from "node:assert/strict";
import WebSocket from "ws";
import {
  SECTIONS,
  type ProcessRunner,
  type Section,
  type SectionReader,
} from "@specgate-studio/core";
import { startHost } from "../src/index.js";

/** A specgate that takes 40 ms per section and answers 5,000 rows, counting reads. */
function specgate() {
  const reads: Section[] = [];
  const reader: SectionReader = {
    async read(section) {
      reads.push(section);
      await new Promise((ok) => setTimeout(ok, 40));
      return {
        section,
        rows: Array.from({ length: 5000 }, (_, i) => ({ id: `REQ-${i}`, title: `Row ${i}` })),
      };
    },
  };
  const runner: ProcessRunner = { run: async () => 0 };
  return { reader, runner, reads };
}

/** A UI: connects, sends requests, collects notifications. */
async function client(url: string) {
  const ws = new WebSocket(url);
  await new Promise((ok, ko) => ws.once("open", ok).once("error", ko));
  let id = 0;
  const pending = new Map<number, (m: { result?: unknown; error?: unknown }) => void>();
  const notes: Array<{ method: string; params: unknown }> = [];
  ws.on("message", (raw) => {
    const m = JSON.parse(String(raw));
    if (typeof m.id === "number" && pending.has(m.id)) pending.get(m.id)!(m);
    else if (m.method) notes.push(m);
  });
  const ask = (method: string, params: unknown = {}) =>
    new Promise<{ result?: unknown; error?: { code: number; message: string } }>((ok) => {
      const n = ++id;
      pending.set(n, ok as never);
      ws.send(JSON.stringify({ jsonrpc: "2.0", id: n, method, params }));
    });
  return { ask, notes, close: () => ws.close() };
}

// ── REQ-001: one core host per open project, over typed JSON-RPC ─────────

test("REQ-001 SCN-001: opening sprich starts one host on a WebSocket on 127.0.0.1, and project.open answers sprich's state", async () => {
  const sg = specgate();
  const host = await startHost({
    projectDir: "/tmp/sprich",
    reader: sg.reader,
    runner: sg.runner,
    port: 0,
  });
  try {
    assert.match(host.url, /^ws:\/\/127\.0\.0\.1:\d+\/$/);
    const ui = await client(host.url);
    const opened = await ui.ask("project.open");
    const result = opened.result as { project: string; sections: Record<string, unknown> };
    assert.equal(result.project, "sprich");
    assert.deepEqual(Object.keys(result.sections).sort(), [...SECTIONS].sort());
    ui.close();
  } finally {
    await host.close();
  }
});

test("REQ-001 SCN-002: two browser tabs share one host — the project is read once", async () => {
  const sg = specgate();
  const host = await startHost({
    projectDir: "/tmp/sprich",
    reader: sg.reader,
    runner: sg.runner,
    port: 0,
  });
  try {
    const tab1 = await client(host.url);
    const tab2 = await client(host.url);
    await Promise.all([tab1.ask("project.open"), tab2.ask("project.open")]);
    assert.equal(sg.reads.length, SECTIONS.length, "each section read once for both tabs");
    tab1.close();
    tab2.close();
  } finally {
    await host.close();
  }
});

test("REQ-001: a method the protocol does not name is refused as JSON-RPC -32601", async () => {
  const sg = specgate();
  const host = await startHost({
    projectDir: "/tmp/sprich",
    reader: sg.reader,
    runner: sg.runner,
    port: 0,
  });
  try {
    const ui = await client(host.url);
    const answer = await ui.ask("shell.exec", { cmd: "rm -rf ." });
    assert.equal(answer.error?.code, -32601);
    ui.close();
  } finally {
    await host.close();
  }
});

test("REQ-001: command events reach every connected UI", async () => {
  const sg = specgate();
  const host = await startHost({
    projectDir: "/tmp/sprich",
    reader: sg.reader,
    runner: sg.runner,
    port: 0,
  });
  try {
    const tab1 = await client(host.url);
    const tab2 = await client(host.url);
    await tab1.ask("command.run", { name: "check" });
    await new Promise((ok) => setTimeout(ok, 20));
    for (const tab of [tab1, tab2]) {
      assert.deepEqual(
        tab.notes
          .filter((n) => n.method === "command.event")
          .map((n) => (n.params as { type: string }).type),
        ["started", "ended"],
      );
    }
    tab1.close();
    tab2.close();
  } finally {
    await host.close();
  }
});

// ── REQ-004: a section's data in under 50 ms after the first read ───────

for (const [scn, section] of [
  ["SCN-007", "changes"],
  ["SCN-008", "questions"],
] as const) {
  test(`REQ-004 ${scn}: once read, ${section} is answered by section.get in under 50 ms`, async () => {
    const sg = specgate();
    const host = await startHost({
      projectDir: "/tmp/sprich",
      reader: sg.reader,
      runner: sg.runner,
      port: 0,
    });
    try {
      const ui = await client(host.url);
      await ui.ask("project.open");
      const times: number[] = [];
      for (let i = 0; i < 20; i++) {
        const start = performance.now();
        const answer = await ui.ask("section.get", { section });
        times.push(performance.now() - start);
        assert.equal((answer.result as { rows: unknown[] }).rows.length, 5000);
      }
      times.sort((a, b) => a - b);
      const p95 = times[Math.floor(times.length * 0.95) - 1]!;
      assert.ok(p95 < 50, `p95 ${p95.toFixed(1)} ms`);
      ui.close();
    } finally {
      await host.close();
    }
  });
}

// ── REQ-013: the installed specgate checked at start ───────────────────

for (const [scn, where] of [
  ["SCN-035", "the desktop app"],
  ["SCN-036", "the browser"],
] as const) {
  test(`REQ-013 ${scn}: 0.29.1 installed, 0.30.0 needed — ${where} is told both and the command, and no section is read`, async () => {
    const sg = specgate();
    const host = await startHost({
      projectDir: "/tmp/sprich",
      reader: sg.reader,
      runner: sg.runner,
      port: 0,
      specgate: { version: async () => "0.29.1" },
      needs: "0.30.0",
    });
    try {
      const ui = await client(host.url);
      const opened = await ui.ask("project.open");
      assert.equal(opened.error?.code, -32001);
      assert.match(
        opened.error?.message ?? "",
        /specgate 0\.29\.1 is installed; the studio needs 0\.30\.0/,
      );
      assert.match(opened.error?.message ?? "", /npm i -g @rsaglobaltech\/specgate@0\.30\.0/);
      assert.equal(sg.reads.length, 0, "no section read");
      ui.close();
    } finally {
      await host.close();
    }
  });
}
