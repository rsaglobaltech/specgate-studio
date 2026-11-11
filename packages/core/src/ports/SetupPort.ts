/**
 * Driven port: what specgate says, as JSON, about a folder to set up
 * (draft-project-setup) — `onboard`, `config list` and `ci status`.
 */
export interface Onboarding {
  /** Whether the folder is adopted already. */
  adopted: boolean;
  /** The test command the stack declares, e.g. `npm test`; null when none. */
  testCommand: string | null;
  /** How many areas adoption finds in the code (ADR-0041). */
  areas: number;
  /** Whether the code is organised by kind — components, hooks, utils — not by area. */
  byKind: boolean;
}

export interface SetupPort {
  onboard(): Promise<Onboarding>;
  /** The project's settings: `test_cmd`, `agent`, `arch_cmd`… */
  config(): Promise<Record<string, string>>;
  /** The CI gate's file, relative to the project; null when there is none. */
  ciFile(): Promise<string | null>;
}
