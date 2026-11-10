import WebSocket from "ws";

/** A UI: connects, sends requests, collects notifications. */
export async function client(url: string) {
  const ws = new WebSocket(url);
  await new Promise((ok, ko) => ws.once("open", ok).once("error", ko));
  let id = 0;
  const pending = new Map<number, (m: { result?: unknown; error?: unknown }) => void>();
  const notes: Array<{ method: string; params: unknown; at: number }> = [];
  ws.on("message", (raw) => {
    const m = JSON.parse(String(raw));
    if (typeof m.id === "number" && pending.has(m.id)) pending.get(m.id)!(m);
    else if (m.method) notes.push({ ...m, at: performance.now() });
  });
  const ask = <T = unknown>(method: string, params: unknown = {}) =>
    new Promise<{ result?: T; error?: { code: number; message: string } }>((ok) => {
      const n = ++id;
      pending.set(n, ok as never);
      ws.send(JSON.stringify({ jsonrpc: "2.0", id: n, method, params }));
    });
  return { ask, notes, close: () => ws.close() };
}
