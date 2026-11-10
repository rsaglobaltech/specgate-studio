/**
 * draft-terminal over JSON-RPC: terminals opened, typed into, listed and
 * closed through the host; their output reaches every UI as it is written
 * (REQ-051, REQ-055, REQ-056).
 */
import test from "node:test";
import assert from "node:assert/strict";
import WebSocket from "ws";
import { InMemoryPty, type ProcessRunner, type SectionReader } from "@specgate-studio/core";
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

const reader: SectionReader = { read: async () => ({}) };
const runner: ProcessRunner = { run: async () => 0 };
const shell = { file: "/bin/zsh", args: ["-l"], name: "zsh" };

test("REQ-051 REQ-055: terminals through the host — opened in the project's folder, typed into, their output to every UI, listed, one closed", async () => {
  const pty = new InMemoryPty();
  const host = await startHost({
    projectDir: "/tmp/sprich",
    reader,
    runner,
    port: 0,
    terminals: { pty, shell },
  });
  const ui = await rpc(host.url);
  const other = await rpc(host.url);
  try {
    const a = (await ui.ask("terminal.open", { cols: 100, rows: 30 })).result;
    const b = (await ui.ask("terminal.open", { cols: 100, rows: 30 })).result;
    assert.deepEqual([a.name, b.name], ["zsh 1", "zsh 2"]);
    assert.equal(pty.spawned[0]!.cwd, "/tmp/sprich");
    await ui.ask("terminal.input", { id: b.id, data: "git status\r" });
    assert.deepEqual(pty.spawned[1]!.pty.written, ["git status\r"]);
    pty.spawned[1]!.pty.emit("On branch feat/mvp-fase-1\r\n");
    await new Promise((ok) => setTimeout(ok, 20));
    for (const tab of [ui, other]) {
      assert.deepEqual(
        tab.notes.filter((n) => n.method === "terminal.data").map((n) => n.params),
        [{ id: b.id, data: "On branch feat/mvp-fase-1\r\n" }],
      );
    }
    assert.deepEqual((await other.ask("terminal.scrollback", { id: b.id })).result, {
      data: "On branch feat/mvp-fase-1\r\n",
    });
    await ui.ask("terminal.resize", { id: a.id, cols: 120, rows: 40 });
    assert.deepEqual(pty.spawned[0]!.pty.size, [120, 40]);
    await ui.ask("terminal.close", { id: a.id });
    assert.deepEqual((await ui.ask("terminal.list", {})).result, [{ id: b.id, name: "zsh 2" }]);
    for (const bad of [{ id: "nope", data: "x" }, { id: b.id }, {}]) {
      assert.equal((await ui.ask("terminal.input", bad)).error?.code, -32602, JSON.stringify(bad));
    }
    assert.equal((await ui.ask("terminal.open", { cols: 0, rows: 30 })).error?.code, -32602);
  } finally {
    ui.close();
    other.close();
    await host.close();
  }
  assert.equal(pty.spawned[1]!.pty.killed, true, "closing the host closes its terminals");
});
