import type { Notifications, Requests } from "@specgate-studio/protocol";

type Listener<N extends keyof Notifications> = (params: Notifications[N]) => void;

/** Whether the host answers: connected, or lost and trying again (draft-design-conformance REQ-178). */
export type Connection = "open" | "lost";

/** Every 1 s while the host is gone, every 5 s after 30 s (A17). */
export function retryDelay(lostForMs: number): number {
  return lostForMs < 30_000 ? 1_000 : 5_000;
}

/**
 * The UI's only way to the core host: JSON-RPC 2.0 over the WebSocket of the
 * address it was served from (ADR-0001 rule 4: the UI imports protocol only).
 * When the host goes, it says so and tries again until it is back
 * (draft-design-conformance REQ-178, A17); a request made meanwhile waits for it.
 */
export class Rpc {
  private next = 1;
  private readonly pending = new Map<
    number,
    { ok: (v: unknown) => void; ko: (e: Error) => void }
  >();
  private readonly listeners = new Map<string, Set<(p: unknown) => void>>();
  private readonly statusListeners = new Set<(c: Connection) => void>();
  private socket!: WebSocket;
  private openNow!: () => void;
  ready!: Promise<void>;
  private lostAt: number | null = null;
  private everOpen = false;
  /** How many requests of each method were sent: the UI reads nothing twice it need not. */
  readonly sent: Record<string, number> = {};

  constructor(
    private readonly url: string,
    private readonly onClose: () => void,
  ) {
    this.waitForOpen();
    this.connect();
  }

  private waitForOpen(): void {
    this.ready = new Promise((ok) => (this.openNow = ok));
  }

  private connect(): void {
    let socket: WebSocket;
    try {
      socket = new WebSocket(this.url);
    } catch {
      this.lost();
      return;
    }
    this.socket = socket;
    socket.addEventListener("open", () => {
      const back = this.lostAt !== null;
      this.lostAt = null;
      this.everOpen = true;
      this.openNow();
      if (back) for (const l of this.statusListeners) l("open");
    });
    socket.addEventListener("close", () => {
      for (const p of this.pending.values()) p.ko(new Error("the host closed"));
      this.pending.clear();
      if (this.everOpen) this.onClose();
      this.lost();
    });
    socket.addEventListener("message", (e) => {
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

  /** The host is gone: say so, and try again (A17). */
  private lost(): void {
    if (this.lostAt === null) {
      this.lostAt = Date.now();
      this.waitForOpen();
      for (const l of this.statusListeners) l("lost");
    }
    setTimeout(() => this.connect(), retryDelay(Date.now() - this.lostAt));
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

  /** Told when the host is lost, and when it is back. */
  onStatus(listener: (c: Connection) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }
}

/** The host's WebSocket: the address the page came from. */
export function hostUrl(location: Location): string {
  return `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/`;
}
