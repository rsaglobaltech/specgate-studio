import { withOpened, type RecentProject } from "../domain/workspace.js";
import type { ClockPort } from "../ports/ClockPort.js";
import type { StorePort } from "../ports/StorePort.js";

const KEY = "recent-projects";

/** Each Developer's last 10 projects, the most recent first (REQ-026, A6). */
export class RecentProjects {
  constructor(
    private readonly store: StorePort,
    private readonly clock: ClockPort,
    private readonly caseInsensitive: boolean,
  ) {}

  async list(): Promise<RecentProject[]> {
    return (await this.store.read<RecentProject[]>(KEY)) ?? [];
  }

  /** A project was opened: it comes first. */
  async opened(path: string): Promise<RecentProject[]> {
    const next = withOpened(await this.list(), path, this.clock.now(), this.caseInsensitive);
    await this.store.write(KEY, next);
    return next;
  }
}
