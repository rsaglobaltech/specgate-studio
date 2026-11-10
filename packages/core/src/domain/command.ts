import type { Lang, Notice } from "./help.js";

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
  | { name: "config-set"; key: string; value: string }
  | { name: "answer"; q: string; answer: string; change: string }
  | { name: "change-note"; change: string; text: string; req?: string };

export interface CommandLine {
  args: string[];
  write: boolean;
}

/**
 * The argument array of a command the port offers, or null for any other name
 * (REQ-016): the UI's request comes over the wire, so its name is not trusted.
 */
export function commandLine(c: SpecgateCommand): CommandLine | null {
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
    case "answer":
      return { args: ["answer", c.q, c.answer, "--change", c.change], write: true };
    case "change-note":
      return {
        args: ["change", "note", c.change, c.text, ...(c.req ? ["--req", c.req] : [])],
        write: true,
      };
    default:
      return null;
  }
}

/** How a command is shown to the person: what they would type. */
export const shown = (args: readonly string[]) => ["specgate", ...args].join(" ");

/** What the UI follows of a run (REQ-005). */
export type CommandEvent =
  | { type: "started"; run: number; command: string }
  | { type: "output"; run: number; chunk: string }
  | {
      type: "ended";
      run: number;
      exitCode: number;
      /** What the person is told, in both languages, when it is known (REQ-063). */
      notice?: Record<Lang, Notice>;
    };

export type RunResult =
  | {
      ok: true;
      run: number;
      exitCode: number;
      /** The files it wrote, when it passed and they are known: the sections they feed are read again. */
      written: string[];
    }
  | { ok: false; code: "write_busy" | "command_unknown"; message: string };
