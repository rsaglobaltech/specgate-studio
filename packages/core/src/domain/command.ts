import type { Finding } from "./finding.js";
import type { Lang, Notice } from "./help.js";
import { AGENT_TOOLS } from "./setup.js";

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
  | { name: "answer-reviewed"; q: string; change: string }
  | { name: "change-note"; change: string; text: string; req?: string }
  // draft-changes: read with --json, never written (REQ-081, REQ-084, REQ-085).
  | { name: "change-show"; change: string }
  | { name: "archive-preview"; change: string }
  | { name: "propose-ticket-check"; key: string }
  // Opens the ticket's change: on its branch already, --no-branch; "Don't push yet", --no-push (REQ-084).
  | { name: "propose-ticket"; key: string; noBranch?: boolean; noPush?: boolean }
  | { name: "adopt-preview" }
  | { name: "adopt" }
  | { name: "agents-init"; tool: string }
  | { name: "ci-init" };

export interface CommandLine {
  args: string[];
  write: boolean;
  /**
   * Run with `--json` through the port when the host has one: what it did and
   * its findings are read from specgate's answer, never from its prose.
   */
  json?: true;
}

/** A change id or a ticket key: one value, never a flag or a path (REQ-007). */
const CHANGE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const TICKET_KEY = /^[A-Z][A-Z0-9_]+-\d+$/;

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
      return { args: ["apply", c.req], write: true, json: true };
    case "archive":
      return { args: ["archive", c.change], write: true, json: true };
    case "config-set":
      return { args: ["config", "set", c.key, c.value], write: true };
    case "answer":
      return { args: ["answer", c.q, c.answer, "--change", c.change], write: true };
    // "The spec says it" (draft-questions REQ-093).
    case "answer-reviewed":
      return { args: ["answer", c.q, "--reviewed", "--change", c.change], write: true };
    case "change-note":
      return {
        args: ["change", "note", c.change, c.text, ...(c.req ? ["--req", c.req] : [])],
        write: true,
      };
    case "change-show":
      return CHANGE_ID.test(c.change)
        ? { args: ["change", "show", c.change], write: false, json: true }
        : null;
    case "archive-preview":
      return CHANGE_ID.test(c.change)
        ? { args: ["archive", c.change, "--dry-run"], write: false, json: true }
        : null;
    case "propose-ticket-check":
      return TICKET_KEY.test(c.key)
        ? { args: ["propose", "--from-ticket", c.key, "--check"], write: false, json: true }
        : null;
    case "propose-ticket":
      return TICKET_KEY.test(c.key)
        ? {
            args: [
              "propose",
              "--from-ticket",
              c.key,
              ...(c.noBranch === true ? ["--no-branch"] : []),
              ...(c.noPush === true ? ["--no-push"] : []),
            ],
            write: true,
            json: true,
          }
        : null;
    case "adopt-preview":
      return { args: ["adopt", "--dry-run"], write: false };
    case "adopt":
      return { args: ["adopt", "--yes"], write: true };
    case "agents-init":
      return Object.prototype.hasOwnProperty.call(AGENT_TOOLS, c.tool)
        ? { args: ["agents", "init", "--tool", c.tool], write: true }
        : null;
    case "ci-init":
      return { args: ["ci", "init"], write: true };
    default:
      return null;
  }
}

/**
 * How a command is shown to the person: what they would type, a value a shell
 * would split or read quoted as one argument (REQ-054). Shown only: commands
 * run with an argument array and no shell (REQ-007).
 */
export const shown = (args: readonly string[]) =>
  [
    "specgate",
    ...args.map((a) => (/^[\w./:=@%+,-]+$/.test(a) ? a : `'${a.replace(/'/g, "'\\''")}'`)),
  ].join(" ");

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
      /** specgate's findings, for a command run with `--json`. */
      findings?: Finding[];
      /** What an archive would write, for `archive <change> --dry-run` (REQ-085). */
      preview?: ArchivePreview;
    }
  | { ok: false; code: "write_busy" | "command_unknown"; message: string };

/** A file an archive writes, from `archive --json`'s `writes`. */
export interface ArchiveWrite {
  file: string;
  /** `spec`, `feature`, `traceability`… as specgate names it. */
  kind: string;
}

/** What `archive <change> --dry-run --json` says it would do (REQ-085). */
export interface ArchivePreview {
  change: string;
  writes: ArchiveWrite[];
  deletes: string[];
  warnings: Finding[];
}
