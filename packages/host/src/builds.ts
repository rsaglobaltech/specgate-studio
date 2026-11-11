import { Builds, type SectionSource, type SpecgatePort } from "@specgate-studio/core";

/** What Build and Live need (draft-build-live). */
export interface BuildsWiring {
  /** specgate answering `--json`: the CLI adapter's `call`, or the in-process one's. */
  specgate: Pick<SpecgatePort, "call">;
}

/**
 * Build and Live in the host (draft-build-live): `build.get` lists what is
 * ready, its estimate and who codes (REQ-101).
 */
export function attachBuilds(
  wiring: BuildsWiring,
  sections: SectionSource,
): { handlers: Record<string, (params: unknown) => Promise<unknown>> } {
  const builds = new Builds({ specgate: wiring.specgate, sections });
  return {
    handlers: {
      "build.get": () => builds.list(),
    },
  };
}
