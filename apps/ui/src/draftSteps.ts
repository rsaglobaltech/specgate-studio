/**
 * What the Brief view shows while "Draft the modules" runs (draft-flow-clarity
 * REQ-241): each module to draft, in order, with its state. The host drafts
 * one module at a time and tells each run as it starts; a second start of the
 * same module is the agent fixing its draft. Nothing here decides: it reads
 * the runs started and, once it ends, the host's result.
 */
export type DraftStepState = "done" | "now" | "fixing" | "todo" | "stopped";

export interface DraftStep {
  module: string;
  state: DraftStepState;
  /** The fix pass under way or last run: 0 before any. */
  pass: number;
  /** specgate's errors on the draft it stopped at. */
  findings: number;
}

export interface DraftEnd {
  drafted: string[];
  stopped?: string | undefined;
  findings?: unknown[] | undefined;
}

/** The module a run drafts: `specgate propose --from-brief <module> --agent …`, or null. */
export function moduleOfRun(command: string): string | null {
  const m = /\bpropose --from-brief ([a-z0-9][a-z0-9-]*) --agent\b/.exec(command);
  return m ? m[1]! : null;
}

export function draftSteps(
  todo: readonly string[],
  started: readonly string[],
  end: DraftEnd | null,
): { done: number; total: number; rows: DraftStep[] } {
  const last = started[started.length - 1];
  const rows = todo.map((module): DraftStep => {
    const runs = started.filter((m) => m === module).length;
    const pass = Math.max(0, runs - 1);
    if (end) {
      if (end.drafted.includes(module)) return { module, state: "done", pass, findings: 0 };
      if (end.stopped === module)
        return { module, state: "stopped", pass, findings: end.findings?.length ?? 0 };
      return { module, state: "todo", pass: 0, findings: 0 };
    }
    if (runs === 0) return { module, state: "todo", pass: 0, findings: 0 };
    if (module !== last) return { module, state: "done", pass, findings: 0 };
    return { module, state: pass > 0 ? "fixing" : "now", pass, findings: 0 };
  });
  return { done: rows.filter((r) => r.state === "done").length, total: rows.length, rows };
}
