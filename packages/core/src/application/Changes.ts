import { commandLine, type SpecgateCommand } from "../domain/command.js";
import {
  deltaFilesOf,
  groupChanges,
  changeIds,
  ticketReview,
  type ChangesView,
  type TicketReview,
} from "../domain/changes.js";
import type { Section, SectionData } from "../domain/section.js";
import type { SpecgateAnswer, SpecgatePort } from "../ports/SpecgatePort.js";

/** The sections already read and kept by ProjectState (REQ-002). */
export interface SectionSource {
  section(section: Section): Promise<SectionData>;
}

/**
 * The Changes view's reads (draft-changes): every open change in its group
 * (REQ-081), a ticket's review before its change opens (REQ-084) and the
 * file Apply wrote (REQ-086). `change list` and `status` come from the cached
 * sections; each change and the ticket from specgate's `--json`, through
 * commands on the allow-list that write nothing.
 */
export class Changes {
  constructor(
    private readonly specgate: Pick<SpecgatePort, "call">,
    private readonly sections: SectionSource,
  ) {}

  async view(): Promise<ChangesView> {
    const [list, status] = await Promise.all([
      this.sections.section("changes"),
      this.sections.section("home"),
    ]);
    const shows: Record<string, unknown> = {};
    await Promise.all(
      changeIds(list).map(async (change) => {
        shows[change] = await this.read({ name: "change-show", change })
          .then((a) => a.data)
          .catch(() => null);
      }),
    );
    return groupChanges(list, status, shows);
  }

  /** The ticket's review, and what its confirmation runs on `branch` (REQ-084). */
  async ticket(key: string, branch: string | null): Promise<TicketReview> {
    return ticketReview(key, await this.read({ name: "propose-ticket-check", key }), branch);
  }

  /** The files a command wrote that its answer does not list: Apply's delta (REQ-086). */
  async written(command: SpecgateCommand): Promise<string[]> {
    if (command.name !== "apply") return [];
    const status = (await this.sections.section("home")) as {
      requirements?: Array<{ id?: unknown; change?: unknown }>;
    } | null;
    const change = status?.requirements?.find((r) => r.id === command.req)?.change;
    if (typeof change !== "string") return [];
    const shown = await this.read({ name: "change-show", change }).catch(() => null);
    return shown ? deltaFilesOf(shown.data, command.req) : [];
  }

  /** A read on the allow-list: a command that writes, or is not offered, is never run here. */
  private read(command: SpecgateCommand): Promise<SpecgateAnswer> {
    const line = commandLine(command);
    if (!line || line.write) {
      return Promise.reject(new Error(`${command.name} is not a read the studio may run`));
    }
    return this.specgate.call(line.args);
  }
}
