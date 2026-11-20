import { gateResultOf, type GateResult, type SpecgatePort } from "@specgate-studio/core";

/**
 * The gate's last result under its policy (specgate-1-4-gate REQ-224,
 * REQ-225): read with `validate --strict --json` each time Check ends, kept
 * for Problems and Home. Nothing is read before the first Check.
 */
export function attachGate(specgate: Pick<SpecgatePort, "call">): {
  /** Reads the gate again; a specgate that cannot answer leaves the last result. */
  refresh(): Promise<GateResult | null>;
  last(): GateResult | null;
} {
  let last: GateResult | null = null;
  return {
    refresh: async () => {
      try {
        last = gateResultOf(await specgate.call(["validate", "--strict"]));
      } catch {
        // specgate did not answer: what Problems shows stays as it was.
      }
      return last;
    },
    last: () => last,
  };
}
