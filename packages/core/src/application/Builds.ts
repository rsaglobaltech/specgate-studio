import { commandLine, type SpecgateCommand } from "../domain/command.js";
import { buildList, type BuildList } from "../domain/build.js";
import { groupChanges, changeIds } from "../domain/changes.js";
import type { SpecgateAnswer, SpecgatePort } from "../ports/SpecgatePort.js";
import type { SectionSource } from "./Changes.js";

export interface BuildsOptions {
  /** specgate answering `--json`: the reads Build makes. */
  specgate: Pick<SpecgatePort, "call">;
  /** The sections ProjectState keeps: `home` is `status --json`, `changes` is `change list`. */
  sections: SectionSource;
}

/**
 * Build and Live (draft-build-live). Build lists what is ready, its estimate
 * and who codes (REQ-101): `status` and `change list` from the kept sections,
 * each change's approval from `change show`, specgate's estimate from
 * `harness report` and the agent from `config list` — reads on the
 * allow-list, each with `--json`.
 */
export class Builds {
  constructor(private readonly options: BuildsOptions) {}

  async list(): Promise<BuildList> {
    const [status, changes] = await Promise.all([
      this.options.sections.section("home"),
      this.options.sections.section("changes"),
    ]);
    const shows: Record<string, unknown> = {};
    const [report, config] = await Promise.all([
      this.data({ name: "harness-report" }),
      this.data({ name: "config-list" }),
      ...changeIds(changes).map(async (change) => {
        shows[change] = await this.data({ name: "change-show", change });
      }),
    ]);
    // A draft no person approved waits for its review (A2).
    const review = new Set(groupChanges(changes, status, shows).groups.review.map((c) => c.id));
    const settings = (config as { config?: Record<string, unknown> } | null)?.config ?? {};
    return buildList(
      status,
      review,
      report,
      Object.fromEntries(
        Object.entries(settings).filter((e): e is [string, string] => typeof e[1] === "string"),
      ),
    );
  }

  /** A read's data, or null when specgate could not answer it. */
  private async data(command: SpecgateCommand): Promise<unknown> {
    const line = commandLine(command);
    if (!line || line.write) return null;
    return this.options.specgate
      .call(line.args)
      .then((a: SpecgateAnswer) => a.data)
      .catch(() => null);
  }
}
