/** Driven port: the time, as ISO 8601 — so the recent projects' order can be tested. */
export interface ClockPort {
  now(): string;
}
