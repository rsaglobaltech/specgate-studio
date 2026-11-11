import {
  Builds,
  type BuildPort,
  type Commands,
  type GitPort,
  type GitWriter,
  type HarnessEventsPort,
  type LiveView,
  type Resolution,
  type SectionSource,
  type SpecgatePort,
} from "@specgate-studio/core";

/** What Build and Live need (draft-build-live). */
export interface BuildsWiring {
  /** specgate answering `--json`: the CLI adapter's `call`, or the in-process one's. */
  specgate: Pick<SpecgatePort, "call">;
  /** The project's git, which Build reads and — once confirmed — commits to or stashes. */
  git?: GitPort & GitWriter;
  /** Runs `specgate harness run` (A5). */
  harness?: BuildPort;
  /** The harness's events, which Live folds (REQ-103, A9). */
  events?: HarnessEventsPort;
  /** How often Live reads them while a build runs, in ms. */
  pollMs?: number;
}

/** A requirement id from the wire. */
const reqOf = (params: unknown) => {
  const req = (params as { req?: unknown } | null)?.req;
  return typeof req === "string" ? req : "";
};

/**
 * Build and Live in the host (draft-build-live): `build.get` lists what is
 * ready, its estimate and who codes (REQ-101); `build.start` builds one or
 * says why it waits, and `build.resolve` runs the commit or stash the
 * Developer confirmed, then builds (REQ-102); one more is queued (REQ-103).
 * Each run is told as a command event, with its notice; when a build ends,
 * every section is read again. `live.get` and `live.changed` are what Live
 * shows, the same for every open UI (REQ-103).
 */
export function attachBuilds(
  projectDir: string,
  wiring: BuildsWiring,
  sections: SectionSource & { fileChanged(path: string): Promise<unknown> },
  commands: Pick<Commands, "track">,
  fail: (message: string) => Error,
  onLive: (view: LiveView) => void,
): {
  handlers: Record<string, (params: unknown) => Promise<unknown>>;
  /** A section was read again: Live is told if what it shows changed — an answer (REQ-104). */
  refresh(): void;
  /** The requirement being built now, or null: an update waits for it (draft-desktop A9). */
  building(): string | null;
  close(): Promise<void>;
} {
  const builds = new Builds({
    specgate: wiring.specgate,
    sections,
    root: projectDir,
    ...(wiring.git ? { git: wiring.git } : {}),
    ...(wiring.harness ? { harness: wiring.harness } : {}),
    commands,
    // What a build changed — the questions it recorded, the status — is read again.
    onEnded: () => void sections.fileChanged("*").catch(() => undefined),
    ...(wiring.events ? { events: wiring.events } : {}),
    ...(wiring.pollMs ? { pollMs: wiring.pollMs } : {}),
    // Every open UI is told what Live shows: a second tab sees the same (SCN-306).
    onLive,
  });
  return {
    handlers: {
      "build.get": () => builds.list(),
      "live.get": () => builds.live(),
      // Stop now arrives only once the Developer confirmed it in the UI (REQ-105).
      "build.stop": (params) => builds.stop((params as { now?: unknown } | null)?.now === true),
      "build.start": (params) => builds.start(reqOf(params)),
      "build.resolve": (params) => {
        const p = (params ?? {}) as { choice?: unknown; message?: unknown };
        const resolution: Resolution | null =
          p.choice === "commit"
            ? { choice: "commit", message: typeof p.message === "string" ? p.message : "" }
            : p.choice === "stash"
              ? { choice: "stash" }
              : p.choice === "ignore"
                ? { choice: "ignore" }
                : null;
        if (!resolution) throw fail("choose commit, stash or ignore");
        return builds.resolve(reqOf(params), resolution);
      },
    },
    refresh: () => void builds.refresh().catch(() => undefined),
    building: () => builds.building,
    // The host waits for the build it started: none outlives it.
    close: () => builds.close(),
  };
}
