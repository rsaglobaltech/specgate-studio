import {
  Agent,
  mentions,
  type Commands,
  type Section,
  type SectionData,
  type SpecgatePort,
  type StorePort,
} from "@specgate-studio/core";
import type { Notifications } from "@specgate-studio/protocol";

/** specgate answering `--json` for the agent panel (draft-workbench-v2 REQ-181 … REQ-183). */
export interface AgentWiring {
  /** The CLI adapter's `call`, or the in-process one's. */
  specgate: Pick<SpecgatePort, "call">;
}

type Broadcast = <N extends keyof Notifications>(method: N, params: Notifications[N]) => void;

/**
 * The agent panel in the host: `agent.get`, `agent.ask`, `agent.apply`,
 * `agent.discard` over the core's Agent use case, which runs specgate's
 * `agent ask|apply|discard --json` — told in the terminal as every command —
 * and `agent.applied`, the applied plans' diffs Changes shows (REQ-182).
 * Every open UI is told what the panel shows (`agent.changed`); the files an
 * applied plan wrote are read again.
 */
export function attachAgent(
  projectDir: string,
  wiring: AgentWiring,
  commands: Pick<Commands, "track">,
  sections: {
    section(s: Section): Promise<SectionData>;
    fileChanged(path: string): Promise<unknown>;
  },
  broadcast: Broadcast,
  files: () => Promise<string[]>,
  store?: StorePort,
): { handlers: Record<string, (params: unknown) => Promise<unknown>> } {
  const nOf = (params: unknown) => (params as { n?: unknown } | null)?.n;
  const agent = new Agent({
    commands,
    specgate: wiring.specgate,
    project: projectDir,
    ...(store ? { store } : {}),
    onChange: (view) => broadcast("agent.changed", view),
    onWritten: async (paths) => {
      for (const p of paths) await sections.fileChanged(p).catch(() => undefined);
      broadcast("files.changed", { paths });
    },
  });
  return {
    handlers: {
      "agent.get": () => agent.view(),
      "agent.ask": (params) => agent.ask((params as { request?: unknown } | null)?.request),
      // Sent only once the Developer saw the diff and confirmed it (REQ-182).
      "agent.apply": (params) => agent.apply(nOf(params)),
      "agent.discard": (params) => agent.discard(nOf(params)),
      "agent.applied": () => agent.applied(),
      // What "@" offers (REQ-183): the project's requirements with their titles, then its files.
      "agent.mentions": async (params) => {
        const query = (params as { query?: unknown } | null)?.query;
        if (typeof query !== "string") return [];
        const [home, list] = await Promise.all([
          sections.section("home").catch(() => null),
          files().catch(() => []),
        ]);
        const reqs = (home as { requirements?: Array<{ id?: unknown; title?: unknown }> } | null)
          ?.requirements;
        return mentions(
          query,
          (Array.isArray(reqs) ? reqs : []).flatMap((r) =>
            typeof r?.id === "string"
              ? [{ id: r.id, title: typeof r.title === "string" ? r.title : null }]
              : [],
          ),
          list,
        );
      },
    },
  };
}
