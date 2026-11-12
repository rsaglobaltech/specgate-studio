import {
  Brief,
  type BriefFormResult,
  type CommandRunner,
  type Commands,
  type Finding,
  type ScratchPort,
  type SpecgatePort,
} from "@specgate-studio/core";
import type { Notifications } from "@specgate-studio/protocol";

/** specgate answering `--json` for the Brief view (draft-brief). */
export interface BriefWiring {
  /** The CLI adapter's `call`, or the in-process one's. */
  specgate: Pick<SpecgatePort, "call">;
  /** Files outside the project for the form and the client's text (REQ-071, REQ-074). */
  scratch?: ScratchPort;
}

type Broadcast = <N extends keyof Notifications>(method: N, params: Notifications[N]) => void;

/**
 * The Brief view in the host (draft-brief): a save of `docs/brief.md` runs its
 * checks, and every UI is told what Problems lists (REQ-072); "Draft the
 * modules" runs the project's agent on each module not drafted yet (REQ-073).
 */
export function attachBrief(
  wiring: BriefWiring,
  commands: CommandRunner & Partial<Pick<Commands, "track">>,
  broadcast: Broadcast,
  /** The sections a write of the brief feeds: read again. */
  fileChanged: (path: string) => Promise<unknown> = async () => undefined,
): {
  handlers: Record<string, (params: unknown) => Promise<unknown>>;
  /** A file the person saved: the brief's checks run when it is the brief. */
  saved(path: string): void;
  /** What the brief's last check found, for the editor's underlines. */
  findings(): Finding[];
} {
  const brief = new Brief(commands, wiring.specgate, wiring.scratch);
  /** A write of the form: Problems, and what reads the brief, told (REQ-071, REQ-072). */
  const told = async (r: BriefFormResult) => {
    if (r.ok && r.written.length) {
      broadcast("problems.changed", { findings: brief.problems() });
      for (const p of r.written) await fileChanged(p).catch(() => undefined);
      broadcast("files.changed", { paths: r.written });
    }
    return r;
  };
  return {
    handlers: {
      "problems.get": async () => brief.problems(),
      // The brief's modules, where each stands, and the agent (REQ-073): reads only.
      "brief.get": () => brief.view(),
      // "Draft the modules": each module not drafted yet, one at a time (REQ-073).
      "brief.draft": () => brief.draft(),
      // The brief as a form, read by specgate; the proposal waiting, if any (REQ-071, REQ-074).
      "brief.form": () => brief.form(),
      "brief.form.save": (params) =>
        brief.saveForm((params as { form?: unknown } | null)?.form).then(told),
      // The client's text: the agent proposes, nothing is written (REQ-074).
      "brief.propose": (params) => brief.propose((params as { text?: unknown } | null)?.text),
      "brief.accept": () => brief.accept().then(told),
      "brief.discard": () => brief.discard(),
    },
    saved: (path) =>
      void brief
        .saved(path)
        .then((findings) => findings && broadcast("problems.changed", { findings }))
        .catch(() => undefined),
    findings: () => brief.problems(),
  };
}
