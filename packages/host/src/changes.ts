import {
  Changes,
  type CommandsOptions,
  type GitPort,
  type SectionSource,
  type SpecgatePort,
} from "@specgate-studio/core";

/** specgate answering `--json` for the Changes view (draft-changes). */
export interface ChangesWiring {
  /** The CLI adapter's `call`, or the in-process one's. */
  specgate: Pick<SpecgatePort, "call">;
}

/**
 * The Changes view in the host: `changes.get` (REQ-081) and `changes.ticket`
 * (REQ-084) over the core's Changes use case, and what Commands needs to run
 * Apply, Archive and the ticket's opening with `--json` (REQ-085, REQ-086).
 * The ticket's review reads the project's branch through the workspace's git.
 */
export function attachChanges(
  projectDir: string,
  wiring: ChangesWiring,
  sections: SectionSource,
  git: GitPort | undefined,
  fail: (message: string) => Error,
): {
  handlers: Record<string, (params: unknown) => Promise<unknown>>;
  commands: Pick<CommandsOptions, "json" | "written">;
} {
  const changes = new Changes(wiring.specgate, sections);
  return {
    handlers: {
      "changes.get": () => changes.view(),
      "changes.ticket": async (params) => {
        const key = (params as { key?: unknown } | null)?.key;
        if (typeof key !== "string" || !/^[A-Z][A-Z0-9_]+-\d+$/.test(key))
          throw fail("a ticket key, like KAN-13");
        const branch = git ? await git.branch(projectDir).catch(() => null) : null;
        return changes.ticket(key, branch);
      },
    },
    commands: {
      json: wiring.specgate,
      written: (command) => changes.written(command),
    },
  };
}
