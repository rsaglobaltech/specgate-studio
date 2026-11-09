/**
 * The specgate commands the host may run, and the argument array each one is
 * (REQ-007): a value is always one element, never text a shell would read.
 * `write` commands change the project and run one at a time (REQ-006).
 */
export type SpecgateCommand =
  | { name: "check" }
  | { name: "status" }
  | { name: "change-validate"; change: string }
  | { name: "apply"; req: string }
  | { name: "archive"; change: string }
  | { name: "config-set"; key: string; value: string };

export interface CommandLine {
  args: string[];
  write: boolean;
}

export function commandLine(c: SpecgateCommand): CommandLine {
  switch (c.name) {
    case "check":
      return { args: ["check"], write: false };
    case "status":
      return { args: ["status"], write: false };
    case "change-validate":
      return { args: ["change", "validate", c.change], write: false };
    case "apply":
      return { args: ["apply", c.req], write: true };
    case "archive":
      return { args: ["archive", c.change], write: true };
    case "config-set":
      return { args: ["config", "set", c.key, c.value], write: true };
  }
}

/** How a command is shown to the person: what they would type. */
export const shown = (args: readonly string[]) => ["specgate", ...args].join(" ");

/** What the UI follows of a run (REQ-005). */
export type CommandEvent =
  | { type: "started"; run: number; command: string }
  | { type: "output"; run: number; chunk: string }
  | { type: "ended"; run: number; exitCode: number };

export type RunResult =
  { ok: true; run: number; exitCode: number } | { ok: false; code: "write_busy"; message: string };
