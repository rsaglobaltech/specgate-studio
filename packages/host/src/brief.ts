import { Brief, type CommandRunner, type Finding, type SpecgatePort } from "@specgate-studio/core";
import type { Notifications } from "@specgate-studio/protocol";

/** specgate answering `--json` for the Brief view (draft-brief). */
export interface BriefWiring {
  /** The CLI adapter's `call`, or the in-process one's. */
  specgate: Pick<SpecgatePort, "call">;
}

type Broadcast = <N extends keyof Notifications>(method: N, params: Notifications[N]) => void;

/**
 * The Brief view in the host (draft-brief): a save of `docs/brief.md` runs its
 * checks, and every UI is told what Problems lists (REQ-072); "Draft the
 * modules" runs the project's agent on each module not drafted yet (REQ-073).
 */
export function attachBrief(
  wiring: BriefWiring,
  commands: CommandRunner,
  broadcast: Broadcast,
): {
  handlers: Record<string, (params: unknown) => Promise<unknown>>;
  /** A file the person saved: the brief's checks run when it is the brief. */
  saved(path: string): void;
  /** What the brief's last check found, for the editor's underlines. */
  findings(): Finding[];
} {
  const brief = new Brief(commands, wiring.specgate);
  return {
    handlers: {
      "problems.get": async () => brief.problems(),
      // The brief's modules, where each stands, and the agent (REQ-073): reads only.
      "brief.get": () => brief.view(),
      // "Draft the modules": each module not drafted yet, one at a time (REQ-073).
      "brief.draft": () => brief.draft(),
    },
    saved: (path) =>
      void brief
        .saved(path)
        .then((findings) => findings && broadcast("problems.changed", { findings }))
        .catch(() => undefined),
    findings: () => brief.problems(),
  };
}
