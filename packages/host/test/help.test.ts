/**
 * draft-help over JSON-RPC: the "?" asks the host for an explanation, which
 * runs nothing (REQ-061, A2); Check's end event carries its notice with the
 * next requirement to apply (REQ-063).
 */
import test from "node:test";
import assert from "node:assert/strict";
import WebSocket from "ws";
import type { ProcessRunner, SectionReader } from "@specgate-studio/core";
import { startHost } from "../src/index.js";

async function rpc(url: string) {
  const ws = new WebSocket(url);
  await new Promise((ok, ko) => ws.once("open", ok).once("error", ko));
  let id = 0;
  const notes: Array<{ method: string; params: any }> = [];
  const pending = new Map<number, (m: any) => void>();
  ws.on("message", (raw) => {
    const m = JSON.parse(String(raw));
    if (pending.has(m.id)) pending.get(m.id)!(m);
    else if (m.method) notes.push(m);
  });
  const ask = (method: string, params: unknown) =>
    new Promise<any>((ok) => {
      const n = ++id;
      pending.set(n, ok);
      ws.send(JSON.stringify({ jsonrpc: "2.0", id: n, method, params }));
    });
  return { ask, notes, close: () => ws.close() };
}

function sprich() {
  const runs: string[][] = [];
  const reader: SectionReader = {
    read: async (s) =>
      s === "home" ? { total: 80, pending: 1, nextCommand: "specgate apply REQ-031" } : {},
  };
  const runner: ProcessRunner = { run: async (args) => (runs.push([...args]), 0) };
  return { reader, runner, runs };
}

test('REQ-061 SCN-181: the "?" beside Check asks the host — five parts with labels, and no command runs', async () => {
  const sg = sprich();
  const host = await startHost({ projectDir: "/tmp/sprich", ...sg, port: 0 });
  const ui = await rpc(host.url);
  try {
    const r = await ui.ask("help.explain", {
      action: "check",
      lang: "en",
      vars: { req: "REQ-031" },
    });
    assert.deepEqual(Object.keys(r.result.explanation), [
      "does",
      "command",
      "files",
      "doesNot",
      "next",
    ]);
    assert.equal(r.result.explanation.command, "specgate check");
    assert.equal(r.result.labels.doesNot, "What it does not do");
    assert.deepEqual(sg.runs, [], "no command was run");
    const es = await ui.ask("help.explain", { action: "check", lang: "es", vars: {} });
    assert.equal(es.result.labels.does, "Qué hace");
    for (const bad of [{ action: "rm", lang: "en" }, { action: "check", lang: "fr" }, {}]) {
      assert.equal((await ui.ask("help.explain", bad)).error?.code, -32602, JSON.stringify(bad));
    }
  } finally {
    ui.close();
    await host.close();
  }
});

test("REQ-063 SCN-185: Check ends — its notice names the next requirement Home says to apply", async () => {
  const sg = sprich();
  const host = await startHost({ projectDir: "/tmp/sprich", ...sg, port: 0 });
  const ui = await rpc(host.url);
  try {
    await ui.ask("project.open", {});
    await ui.ask("command.run", { name: "check" });
    await new Promise((ok) => setTimeout(ok, 20));
    const ended = ui.notes.find((n) => n.method === "command.event" && n.params.type === "ended");
    assert.equal(ended?.params.notice.en.next, "specgate apply REQ-031");
    assert.match(ended?.params.notice.es.wrote, /No se escribió ningún archivo/);
  } finally {
    ui.close();
    await host.close();
  }
});
