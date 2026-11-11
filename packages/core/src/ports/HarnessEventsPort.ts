/** The harness's events as they are on disk (draft-build-live A9). */
export interface HarnessEventsSnapshot {
  /** Each requirement's `.harness/events/<REQ>.jsonl`, by requirement: its JSON lines. */
  files: Record<string, string>;
  /** `.harness/events/queue.json`: the last run's queue and when it started; null when none. */
  queue: string | null;
}

/**
 * Driven port: the events `specgate harness run` writes as it works — one
 * JSON line per step, gate, message, question and usage (specgate ADR-0037).
 * Only the files written at or after `since` (epoch seconds) need be read.
 */
export interface HarnessEventsPort {
  read(root: string, since: number): Promise<HarnessEventsSnapshot>;
}
