import { Traceability, type TraceAgent, type TraceFiles } from "@specgate-studio/core";
import type { Notifications } from "@specgate-studio/protocol";

type Broadcast = <N extends keyof Notifications>(method: N, params: Notifications[N]) => void;

/** A requirement's id and a scenario's, as specgate writes them: one value, never a flag. */
const REQ = /^REQ-\d+$/;
const SCN = /^SCN-[A-Za-z0-9._-]{1,40}$/;

/**
 * Traceability in the host (draft-traceability REQ-121 … REQ-123): its rows
 * from the core host's memory, "Fix"'s proposal, and the writes once the
 * Developer confirms — the skeleton through the file port, the agent's test
 * through `specgate agent apply`. A file written is told to every open UI.
 */
export function attachTraceability(
  wiring: {
    sections: ConstructorParameters<typeof Traceability>[0]["sections"];
    files: TraceFiles;
    agent?: TraceAgent;
  },
  broadcast: Broadcast,
  invalid: (message: string) => Error,
): { handlers: Record<string, (params: unknown) => Promise<unknown>> } {
  const trace = new Traceability(wiring);
  const ids = (params: unknown) => {
    const p = (params ?? {}) as { requirement?: unknown; scenario?: unknown };
    if (
      typeof p.requirement !== "string" ||
      !REQ.test(p.requirement) ||
      typeof p.scenario !== "string" ||
      !SCN.test(p.scenario)
    )
      throw invalid("a requirement and a scenario: REQ-020, SCN-020b");
    return { requirement: p.requirement, scenario: p.scenario };
  };
  const told = <T extends { written: string | null }>(r: T): T => {
    if (r.written) broadcast("files.changed", { paths: [r.written] });
    return r;
  };
  return {
    handlers: {
      "trace.get": () => trace.view(),
      "trace.fix": async (params) => {
        const { requirement, scenario } = ids(params);
        return trace.fix(requirement, scenario);
      },
      // Sent only once the Developer confirmed: the skeleton proposed now is written.
      "trace.confirm": async (params) => {
        const { requirement, scenario } = ids(params);
        return told(await trace.confirm(requirement, scenario));
      },
      "trace.cancel": async (params) => {
        const { requirement, scenario } = ids(params);
        const plan = (params as { plan?: unknown }).plan;
        return trace.cancel(requirement, scenario, typeof plan === "number" ? plan : undefined);
      },
      "trace.ask": async (params) => {
        const { requirement, scenario } = ids(params);
        return trace.ask(requirement, scenario);
      },
      "trace.agentConfirm": async (params) => {
        const { requirement, scenario } = ids(params);
        const p = params as { plan?: unknown; path?: unknown };
        if (typeof p.plan !== "number" || typeof p.path !== "string")
          throw invalid("the plan's number and the test's path");
        return told(await trace.confirmAgent(p.plan, requirement, scenario, p.path));
      },
    },
  };
}
