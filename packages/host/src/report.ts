import {
  reportOf,
  type Finding,
  type ProjectState,
  type ReportView,
  type SpecgateAnswer,
  type SpecgatePort,
} from "@specgate-studio/core";

/** What Report reads beyond the sections (draft-report REQ-131, REQ-132). */
export interface ReportWiring {
  state: ProjectState;
  /** specgate 0.34's `report`, `harness report [--capability]` and `check --last`, as `--json`. */
  specgate?: Pick<SpecgatePort, "call">;
}

/** A module name as specgate's capability: a folder name, never an option. */
const MODULE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * `report.get` (REQ-131, REQ-132): Report for the project, or for one module —
 * the harness's figures with `--capability <module>` (specgate REQ-502) — and
 * the last gate specgate recorded, `check --last` (specgate REQ-504). Read
 * only: no gate is run to show it; a part specgate cannot give is not
 * measured, never guessed.
 */
export function attachReport(wiring: ReportWiring): {
  handlers: Record<string, (params: unknown) => Promise<unknown>>;
} {
  const ask = (args: string[]): Promise<SpecgateAnswer | null> =>
    wiring.specgate ? wiring.specgate.call(args).catch(() => null) : Promise.resolve(null);
  const handlers: Record<string, (params: unknown) => Promise<unknown>> = {
    "report.get": async (params): Promise<ReportView> => {
      const raw = (params as { module?: unknown } | null)?.module;
      const module = typeof raw === "string" && MODULE.test(raw) ? raw : null;
      const [status, matrix, questions, report, harness, harnessModule, last] = await Promise.all([
        wiring.state.section("home").catch(() => null),
        wiring.state.section("matrix").catch(() => null),
        wiring.state.section("questions").catch(() => null),
        ask(["report"]),
        ask(["harness", "report"]),
        module ? ask(["harness", "report", "--capability", module]) : Promise.resolve(null),
        ask(["check", "--last"]),
      ]);
      const findings: Finding[] = report?.findings ?? [];
      return reportOf({
        module,
        status,
        matrix,
        questions,
        report: report?.data ?? (await wiring.state.section("report").catch(() => null)),
        reportFindings: findings,
        harness: harness?.data ?? null,
        harnessModule: harnessModule?.data ?? null,
        lastCheck: last?.data ?? null,
      });
    },
  };
  return { handlers };
}
