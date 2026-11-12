import type { Finding } from "./finding.js";
import type { Lang, Notice } from "./help.js";
import { AGENT_TOOLS } from "./setup.js";
import { BRIEF_FILE } from "./brief.js";
import { PLAN_ID, validRequest } from "./agent.js";

/**
 * The specgate commands the host may run, and the argument array each one is
 * (REQ-007): a value is always one element, never text a shell would read.
 * `write` commands change the project and run one at a time (REQ-006).
 */
export type SpecgateCommand =
  | { name: "check" }
  | { name: "status" }
  // Home's "Doctor" (draft-design-conformance REQ-173, A9): every diagnostic, read-only.
  | { name: "doctor" }
  | { name: "change-validate"; change: string }
  | { name: "apply"; req: string }
  | { name: "archive"; change: string }
  | { name: "config-set"; key: string; value: string }
  // Settings' Save (draft-settings REQ-142): `config set` with --json, its file and refusal in the answer.
  | { name: "settings-save"; key: string; value: string }
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
  | { name: "ci-init" }
  // draft-build-live: Build's estimate and who codes, read with --json (REQ-101).
  | { name: "harness-report" }
  // Build's estimate per requirement (`plan --json`'s `estimates`, specgate REQ-493).
  | { name: "plan" }
  // "Stop after this requirement": the run finishes its requirement and starts no other (REQ-105, specgate REQ-491).
  | { name: "harness-stop" }
  // draft-brief: the brief's checks on every save (REQ-072), read with --json.
  | { name: "brief-check" }
  // The brief's modules and where each stands, and the project's settings (REQ-073).
  | { name: "brief-modules" }
  | { name: "config-list" }
  // A module drafted by the project's agent (REQ-073, A6): the host's, never the wire's.
  | { name: "draft-module"; module: string; agent: string }
  // "Draft again with N requested changes" (draft-changes REQ-083): the same command, its open notes handed over by specgate.
  | { name: "redraft"; module: string; agent: string; open: number }
  // The brief as a form (draft-brief REQ-071): read, and written back from a file outside the project.
  | { name: "brief-form" }
  | { name: "brief-form-write"; file: string }
  // The client's text proposes a form; nothing is written in the project (REQ-074, specgate REQ-488).
  | { name: "brief-propose"; file: string; agent: string }
  // The agent panel (draft-workbench-v2 REQ-181 … REQ-183): a plan, then applied or discarded.
  | { name: "agent-ask"; request: string }
  | { name: "agent-apply"; id: string }
  | { name: "agent-discard"; id: string }
  | { name: "agent-plans" };

/** A key of specgate's catalog, a profile's or a check's included: `test_cmd`, `profiles.claude-opus.agent`. */
const CONFIG_KEY = /^[a-z][a-z0-9_]*(\.[A-Za-z0-9][A-Za-z0-9_-]*)*$/;

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
/** A module of the brief: lowercase words with dashes, as specgate names them. */
const MODULE = /^[a-z0-9][a-z0-9-]*$/;
/** A file the host made outside the project: an absolute path, one value, never a flag. */
const SCRATCH = /^(\/|[A-Za-z]:[\\/])[^\r\n\0]*$/;
/** An agent's command: one value, never a flag, on one line. */
const AGENT = /^[^-\r\n][^\r\n]*$/;

/**
 * The commands the host runs itself and a request over the wire may not
 * name: a module's draft runs the project's agent, never one the request
 * names (draft-brief A6).
 */
export function fromWire(c: SpecgateCommand): boolean {
  const name = (c as { name?: unknown } | null)?.name;
  // The agent's plans go through the panel, which keeps them (REQ-181 … REQ-183).
  return (
    name !== "draft-module" &&
    name !== "redraft" &&
    name !== "brief-form-write" &&
    name !== "brief-propose" &&
    !(typeof name === "string" && name.startsWith("agent-"))
  );
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
    case "doctor":
      return { args: ["doctor"], write: false };
    case "change-validate":
      return { args: ["change", "validate", c.change], write: false };
    case "apply":
      return { args: ["apply", c.req], write: true, json: true };
    case "archive":
      return { args: ["archive", c.change], write: true, json: true };
    case "config-set":
      return { args: ["config", "set", c.key, c.value], write: true };
    case "settings-save":
      return typeof c.key === "string" &&
        CONFIG_KEY.test(c.key) &&
        typeof c.value === "string" &&
        !c.value.includes("\0")
        ? { args: ["config", "set", c.key, c.value], write: true, json: true }
        : null;
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
    case "harness-report":
      return { args: ["harness", "report"], write: false, json: true };
    case "plan":
      return { args: ["plan"], write: false, json: true };
    // Writes only the stop request the running harness reads, outside the project's files.
    case "harness-stop":
      return { args: ["harness", "stop", "--after-current"], write: false, json: true };
    case "brief-check":
      return {
        args: ["propose", "--from-brief", "--check", "--brief", BRIEF_FILE],
        write: false,
        json: true,
      };
    case "brief-modules":
      return { args: ["propose", "--from-brief"], write: false, json: true };
    case "config-list":
      return { args: ["config", "list"], write: false, json: true };
    case "draft-module":
    case "redraft":
      return typeof c.module === "string" &&
        MODULE.test(c.module) &&
        typeof c.agent === "string" &&
        AGENT.test(c.agent)
        ? {
            args: ["propose", "--from-brief", c.module, "--agent", c.agent],
            write: true,
            json: true,
          }
        : null;
    case "brief-form":
      return { args: ["propose", "--from-brief", "--form"], write: false, json: true };
    case "brief-form-write":
      return SCRATCH.test(c.file)
        ? { args: ["propose", "--from-brief", "--form", c.file], write: true, json: true }
        : null;
    case "brief-propose":
      return SCRATCH.test(c.file) && typeof c.agent === "string" && AGENT.test(c.agent)
        ? {
            args: ["propose", "--from-brief", "--brief", c.file, "--agent", c.agent],
            write: false,
            json: true,
          }
        : null;
    // Writes nothing in the project: the plan is kept in the git folder (specgate REQ-520).
    case "agent-ask":
      return validRequest(c.request)
        ? { args: ["agent", "ask", c.request, "--plan"], write: false, json: true }
        : null;
    // Writes the plan's files, byte for byte, and runs its checks (REQ-182).
    case "agent-apply":
      return typeof c.id === "string" && PLAN_ID.test(c.id)
        ? { args: ["agent", "apply", c.id], write: true, json: true }
        : null;
    case "agent-discard":
      return typeof c.id === "string" && PLAN_ID.test(c.id)
        ? { args: ["agent", "discard", c.id], write: false, json: true }
        : null;
    case "agent-plans":
      return { args: ["agent", "plans"], write: false, json: true };
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
