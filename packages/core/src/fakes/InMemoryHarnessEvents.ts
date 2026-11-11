import type { HarnessEventsPort, HarnessEventsSnapshot } from "../ports/HarnessEventsPort.js";

/** The harness's events in memory: a test appends what the harness and the agent would write. */
export class InMemoryHarnessEvents implements HarnessEventsPort {
  private readonly files: Record<string, string> = {};
  private queue: string | null = null;
  /** How many times they were read. */
  reads = 0;

  /** One event of `req`, as one JSON line; `t` is now unless given. */
  append(req: string, event: Record<string, unknown>): void {
    const line = { t: Math.floor(Date.now() / 1000), req, ...event };
    this.files[req] = (this.files[req] ?? "") + `${JSON.stringify(line)}\n`;
  }

  setQueue(t: number, queue: string[]): void {
    this.queue = JSON.stringify({ t, queue });
  }

  async read(_root: string, _since: number): Promise<HarnessEventsSnapshot> {
    this.reads++;
    return { files: { ...this.files }, queue: this.queue };
  }
}
