/**
 * The core host's budget (REQ-004): a section answered in under 50 ms once
 * read. Run apart from the other tests, one file at a time, so what is
 * measured is the host and not the machine's other work.
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
