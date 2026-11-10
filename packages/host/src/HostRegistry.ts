import { toPosix } from "@specgate-studio/core";
import type { Host } from "./startHost.js";

/**
 * The core hosts of the open projects (REQ-026, Q1): one per project, each on
 * its own port. Opening a project already open answers its host — the UI
 * brings its window forward — and never starts a second one.
 */
export class HostRegistry {
  private readonly hosts = new Map<string, Promise<Host>>();

  constructor(
    private readonly start: (projectDir: string) => Promise<Host>,
    private readonly caseInsensitive: boolean,
  ) {}

  /** A host started elsewhere — the first project's — joins the registry. */
  add(projectDir: string, host: Host): void {
    this.hosts.set(this.key(projectDir), Promise.resolve(host));
  }

  async open(projectDir: string): Promise<{ url: string; reused: boolean; host: Host }> {
    const key = this.key(projectDir);
    const running = this.hosts.get(key);
    if (running) return { url: (await running).url, reused: true, host: await running };
    const starting = this.start(projectDir);
    this.hosts.set(key, starting);
    starting.catch(() => this.hosts.delete(key));
    const host = await starting;
    return { url: host.url, reused: false, host };
  }

  get size(): number {
    return this.hosts.size;
  }

  async closeAll(): Promise<void> {
    const all = [...this.hosts.values()];
    this.hosts.clear();
    await Promise.all(all.map(async (h) => (await h).close().catch(() => undefined)));
  }

  private key(projectDir: string): string {
    const p = toPosix(projectDir);
    return this.caseInsensitive ? p.toLowerCase() : p;
  }
}
