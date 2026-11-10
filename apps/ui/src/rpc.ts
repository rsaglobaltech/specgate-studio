import type { Notifications, Requests } from "@specgate-studio/protocol";

type Listener<N extends keyof Notifications> = (params: Notifications[N]) => void;

/**
 * The UI's only way to the core host: JSON-RPC 2.0 over the WebSocket of the
 * address it was served from (ADR-0001 rule 4: the UI imports protocol only).
 */
export class Rpc {
  private next = 1;
  private readonly pending = new Map<
    number,
    { ok: (v: unknown) => void; ko: (e: Error) => void }
  >();
  private readonly listeners = new Map<string, Set<(p: unknown) => void>>();
  private readonly socket: WebSocket;
  readonly ready: Promise<void>;
  /** How many requests of each method were sent: the UI reads nothing twice it need not. */
  readonly sent: Record<string, number> = {};

  constructor(url: string, onClose: () => void) {
    this.socket = new WebSocket(url);
    this.ready = new Promise((ok, ko) => {
      this.socket.addEventListener("open", () => ok(), { once: true });
      this.socket.addEventListener("error", () => ko(new Error(`cannot reach ${url}`)), {
        once: true,
      });
    });
    this.socket.addEventListener("close", () => {
      for (const p of this.pending.values()) p.ko(new Error("the host closed"));
      this.pending.clear();
      onClose();
    });
    this.socket.addEventListener("message", (e) => {
      const m = JSON.parse(String(e.data)) as {
        id?: number;
        method?: string;
        params?: unknown;
        result?: unknown;
        error?: { code: number; message: string };
      };
      if (typeof m.id === "number" && this.pending.has(m.id)) {
        const p = this.pending.get(m.id)!;
        this.pending.delete(m.id);
        if (m.error) p.ko(Object.assign(new Error(m.error.message), { code: m.error.code }));
        else p.ok(m.result);
      } else if (m.method) {
        for (const l of this.listeners.get(m.method) ?? []) l(m.params);
      }
    });
  }

  async ask<M extends keyof Requests>(
    method: M,
    params: Requests[M]["params"],
  ): Promise<Requests[M]["result"]> {
    await this.ready;
    const id = this.next++;
    this.sent[method] = (this.sent[method] ?? 0) + 1;
    return new Promise((ok, ko) => {
      this.pending.set(id, { ok: ok as (v: unknown) => void, ko });
      this.socket.send(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
    });
  }

  on<N extends keyof Notifications>(method: N, listener: Listener<N>): () => void {
    const set = this.listeners.get(method) ?? new Set();
    set.add(listener as (p: unknown) => void);
    this.listeners.set(method, set);
    return () => set.delete(listener as (p: unknown) => void);
  }
}

/** The host's WebSocket: the address the page came from. */
export function hostUrl(location: Location): string {
  return `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/`;
}
