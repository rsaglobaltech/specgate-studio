import {
  Builds,
  type BuildPort,
  type Commands,
  type GitPort,
  type GitWriter,
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
 * Developer confirmed, then builds (REQ-102). Each run is told as a command
 * event, with its notice; when a build ends, every section is read again.
 */
export function attachBuilds(
  projectDir: string,
  wiring: BuildsWiring,
  sections: SectionSource & { fileChanged(path: string): Promise<unknown> },
  commands: Pick<Commands, "track">,
  fail: (message: string) => Error,
): {
  handlers: Record<string, (params: unknown) => Promise<unknown>>;
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
  });
  return {
    handlers: {
      "build.get": () => builds.list(),
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
    // The host waits for the build it started: none outlives it.
    close: () => builds.close(),
  };
}
