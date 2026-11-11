import type { Finding } from "./finding.js";
import type { Lang, Notice, Outcome } from "./help.js";

/** The brief the Brief view edits, checks and drafts from (draft-brief A1). */
export const BRIEF_FILE = "docs/brief.md";

/**
 * How the brief's check ended, for its notice (REQ-072): its findings are what
 * it found, not a refusal — they go to Problems — so a check specgate answered
 * is a check that ran, whatever its exit code. Only a check with no answer
 * (`draft: null`, no brief to read) is told with specgate's finding.
 */
export function briefCheckOutcome(data: unknown, findings: Finding[], exitCode: number): Outcome {
  const draft = (data as { draft?: unknown } | null)?.draft;
  return draft && typeof draft === "object"
    ? { exitCode: 0, findings: [], written: [] }
    : { exitCode, findings, written: [] };
}

/** specgate's findings with their file as the project names it: relative, with `/`. */
export function posixFindings(findings: Finding[]): Finding[] {
  return findings.map((f) => (f.file ? { ...f, file: f.file.replace(/\\/g, "/") } : f));
}

/** A module of the brief and where it stands, from `propose --from-brief --json` (REQ-073). */
export interface BriefModule {
  module: string;
  /** Its draft change: `draft-<module>`. */
  change: string;
  /** specgate's word for it: not started, not written, drafting, ready, archived. */
  state: string;
  /** Whether "Draft the modules" leaves it alone: drafted already, or archived. */
  drafted: boolean;
}

/** What the Brief view shows: the brief's modules and the agent that drafts them. */
export interface BriefView {
  modules: BriefModule[];
  /** The project's agent (`config list`'s `agent`), or null when none is set (A6, A8). */
  agent: string | null;
}

/**
 * Not drafted yet: no draft, or a draft opened and never written (A6). A draft
 * the agent wrote — with findings still to fix, or ready — is drafted, and an
 * archived one is done.
 */
const NOT_DRAFTED = new Set(["not started", "not written"]);

/** The brief's modules, in its order, from `propose --from-brief --json`'s `draft.modules`. */
export function briefModulesOf(data: unknown): BriefModule[] {
  const list = (data as { draft?: { modules?: unknown } } | null)?.draft?.modules;
  if (!Array.isArray(list)) return [];
  return list.flatMap((m: { module?: unknown; change?: unknown; state?: unknown }) =>
    typeof m?.module === "string" && typeof m.state === "string"
      ? [
          {
            module: m.module,
            change: typeof m.change === "string" ? m.change : `draft-${m.module}`,
            state: m.state,
            drafted: !NOT_DRAFTED.has(m.state),
          },
        ]
      : [],
  );
}

/** The project's agent from `config list --json`, or null when none is set. */
export function agentOf(data: unknown): string | null {
  const agent = (data as { config?: { agent?: unknown } } | null)?.config?.agent;
  return typeof agent === "string" && agent.trim() ? agent.trim() : null;
}

/** The command that sets the agent, since specgate 0.33.0 (A8). */
export const SET_AGENT = "specgate agents init --tool claude";

const SAY: Record<
  Lang,
  { noAgent: string; noAgentFix: string; busy: string; nothing: string; none: string; next: string }
> = {
  en: {
    noAgent: '"Draft the modules" ran nothing: no agent is set for the project.',
    noAgentFix: `\`${SET_AGENT}\` sets Claude Code as the agent; then press "Draft the modules" again.`,
    busy: '"Draft the modules" was refused with write_busy: {message}',
    nothing: 'Every module of the brief is drafted already: "Draft the modules" ran nothing.',
    none: "Nothing was written.",
    next: "specgate propose --from-brief",
  },
  es: {
    noAgent: '"Redactar los módulos" no ejecutó nada: el proyecto no tiene un agente configurado.',
    noAgentFix: `\`${SET_AGENT}\` configura Claude Code como agente; después pulsa otra vez "Redactar los módulos".`,
    busy: '"Redactar los módulos" se rechazó con write_busy: {message}',
    nothing:
      'Todos los módulos del brief están redactados ya: "Redactar los módulos" no ejecutó nada.',
    none: "No se escribió nada.",
    next: "specgate propose --from-brief",
  },
};

/** "Draft the modules" with no agent set: nothing runs, and the way to set one (SCN-217). */
export function noAgentNotice(): Record<Lang, Notice> {
  const one = (l: Lang): Notice => ({
    tone: "refused",
    ran: SAY[l].noAgent,
    wrote: SAY[l].none,
    next: SET_AGENT,
    fix: SAY[l].noAgentFix,
  });
  return { en: one("en"), es: one("es") };
}

/** "Draft the modules" while a draft runs: refused, naming it (SCN-216). */
export function busyNotice(running: string, message: string): Record<Lang, Notice> {
  const one = (l: Lang): Notice => ({
    tone: "refused",
    ran: SAY[l].busy.replace("{message}", message),
    wrote: SAY[l].none,
    next: running,
  });
  return { en: one("en"), es: one("es") };
}

/** "Draft the modules" with every module drafted: nothing ran, and where they stand. */
export function nothingToDraftNotice(): Record<Lang, Notice> {
  const one = (l: Lang): Notice => ({
    tone: "ok",
    ran: SAY[l].nothing,
    wrote: SAY[l].none,
    next: SAY[l].next,
  });
  return { en: one("en"), es: one("es") };
}

/** What a module's draft wrote, from its answer: its change's folder. */
export function draftWritten(data: unknown): string[] {
  const change = (data as { draft?: { change?: unknown } } | null)?.draft?.change;
  return typeof change === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(change)
    ? [`docs/specs/changes/${change}/`]
    : [];
}
