import {
  reportOf,
  type ProjectState,
  type ReportView,
  type SpecgatePort,
} from "@specgate-studio/core";

/** What Report reads beyond the sections (draft-report REQ-131). */
export interface ReportWiring {
  state: ProjectState;
  /** `harness report --json`: diff coverage, mutation, cost and time. */
  specgate?: Pick<SpecgatePort, "call">;
}

/**
 * `report.get` (REQ-131): Report's figures for the project, or for one
 * module — the harness's read with `--capability <module>` (A4). Read-only; a
 * part specgate cannot give is not measured, never guessed.
 */
export function attachReport(wiring: ReportWiring): {
  handlers: Record<string, (params: unknown) => Promise<unknown>>;
} {
  const handlers: Record<string, (params: unknown) => Promise<unknown>> = {
    "report.get": async (params): Promise<ReportView> => {
      const raw = (params as { module?: unknown } | null)?.module;
      const module = typeof raw === "string" && raw ? raw : null;
      const harness = ["harness", "report", ...(module ? ["--capability", module] : [])];
      const [status, report, matrix, h] = await Promise.all([
        wiring.state.section("home").catch(() => null),
        wiring.state.section("report").catch(() => null),
        wiring.state.section("matrix").catch(() => null),
        wiring.specgate
          ? wiring.specgate.call(harness).then(
              (a) => a.data,
              () => null,
            )
          : null,
      ]);
      return reportOf({ module, status, report, matrix, harness: h });
    },
  };
  return { handlers };
}
