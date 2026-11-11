import type { Finding } from "./finding.js";
import { commandLine, shown, type ArchivePreview, type SpecgateCommand } from "./command.js";

/**
 * The Changes view (draft-changes): each open change in the group its state
 * puts it in (REQ-081), a ticket's review before its change opens (REQ-084)
 * and an archive's preview (REQ-085) — all read from specgate's `--json`
 * answers, never from its prose or its files.
 */

export const CHANGE_GROUPS = ["review", "progress", "ready"] as const;
export type ChangeGroup = (typeof CHANGE_GROUPS)[number];

export interface ChangeRequirement {
  id: string;
  title: string | null;
  /** specgate status says DONE: the requirement is Implemented. */
  applied: boolean;
  /** What it still needs, as specgate status says it. */
  needs: string | null;
}

export interface ChangeCard {
  id: string;
  group: ChangeGroup;
  /** Drafted from a brief or a ticket: a person approves it before Build. */
  draft: boolean;
  /** When a person approved the draft, or null. */
  approved: string | null;
  /** The ticket it was opened from, or null. */
  ticket: string | null;
  /** The brief's module of a draft (`draft-pedidos` → `pedidos`), or null. */
  module: string | null;
  requirements: ChangeRequirement[];
  /** The requirements not applied yet: while any is, the change is not archived. */
  toApply: string[];
}

export interface ChangesView {
  groups: Record<ChangeGroup, ChangeCard[]>;
}

interface StatusRequirement {
  id?: unknown;
  title?: unknown;
  category?: unknown;
  needs?: unknown;
  change?: unknown;
}

const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);

/** The ids of `change list --json`. */
export function changeIds(list: unknown): string[] {
  const changes = (list as { changes?: Array<{ id?: unknown }> } | null)?.changes;
  return Array.isArray(changes) ? changes.map((c) => str(c?.id)).filter((id) => id !== null) : [];
}

/**
 * The open changes in three groups (REQ-081, A2): "to review" — a draft no
 * person approved yet; "in progress" — a requirement still to apply, or none
 * written yet; "ready to archive" — every requirement applied. `list` is
 * `change list --json`, `status` is `status --json` and `shows` each change's
 * `change show --json`, by id (null when specgate could not show it: such a
 * change stays in progress, never offered for archive).
 */
export function groupChanges(
  list: unknown,
  status: unknown,
  shows: Record<string, unknown>,
): ChangesView {
  const all = (status as { requirements?: StatusRequirement[] } | null)?.requirements;
  const requirements = Array.isArray(all) ? all : [];
  const groups: Record<ChangeGroup, ChangeCard[]> = { review: [], progress: [], ready: [] };
  for (const id of changeIds(list)) {
    const config =
      (shows[id] as { change?: { config?: Record<string, unknown> } } | null)?.change?.config ?? {};
    const draft = str(config.brief) !== null;
    const approved = config.approved == null ? null : String(config.approved);
    const reqs: ChangeRequirement[] = requirements
      .filter((r) => r.change === id && str(r.id))
      .map((r) => ({
        id: r.id as string,
        title: str(r.title),
        applied: r.category === "DONE",
        needs: str(r.needs),
      }));
    const toApply = reqs.filter((r) => !r.applied).map((r) => r.id);
    // One specgate could not show is never offered for archive.
    const unknown = shows[id] == null;
    const group: ChangeGroup =
      draft && !approved
        ? "review"
        : unknown || reqs.length === 0 || toApply.length
          ? "progress"
          : "ready";
    groups[group].push({
      id,
      group,
      draft,
      approved,
      ticket: str(config.ticket),
      module: draft && id.startsWith("draft-") ? id.slice("draft-".length) : null,
      requirements: reqs,
      toApply,
    });
  }
  return { groups };
}

/** The delta files of `change show --json` that add or modify `req` (what Apply writes, REQ-086). */
export function deltaFilesOf(show: unknown, req: string): string[] {
  const deltas = (show as { change?: { deltas?: unknown } } | null)?.change?.deltas;
  if (!Array.isArray(deltas)) return [];
  const names = (list: unknown) =>
    Array.isArray(list) &&
    list.some((e) => typeof e === "string" && (e === req || e.startsWith(`${req} `)));
  return deltas
    .filter((d: { added?: unknown; modified?: unknown }) => names(d.added) || names(d.modified))
    .map((d: { file?: unknown }) => str(d.file))
    .filter((f): f is string => f !== null)
    .map((f) => f.replace(/\\/g, "/"));
}

/** The preview in `archive --json`'s answer, or null when it refused. */
export function archivePreviewOf(data: unknown): ArchivePreview | null {
  const a = (data as { archive?: Record<string, unknown> | null } | null)?.archive;
  if (!a || typeof a !== "object") return null;
  const writes = (Array.isArray(a.writes) ? a.writes : [])
    .map((w: { file?: unknown; kind?: unknown }) => ({
      file: (str(w.file) ?? "").replace(/\\/g, "/"),
      kind: str(w.kind) ?? "",
    }))
    .filter((w) => w.file !== "");
  const deletes = (Array.isArray(a.deletes) ? a.deletes : [])
    .map((d: unknown) => str(typeof d === "string" ? d : (d as { file?: unknown })?.file))
    .filter((f): f is string => f !== null);
  return {
    change: str(a.change) ?? "",
    writes,
    deletes,
    warnings: Array.isArray(a.warnings) ? (a.warnings as Finding[]) : [],
  };
}

/**
 * What an archive wrote: its files, and the folder the change moved to —
 * the Changes section follows it.
 */
export function archiveWritten(data: unknown): string[] {
  const preview = archivePreviewOf(data);
  if (!preview) return [];
  const as = str((data as { archive?: { archivedAs?: unknown } }).archive?.archivedAs);
  return [
    ...preview.writes.map((w) => w.file),
    ...(as ? [`docs/specs/changes/archive/${as}/`] : []),
  ];
}

/** The ticket a branch names, as specgate reads it: `feature/parking/KAN-13`, `feature/KAN-13-slug`. */
export function ticketOfBranch(branch: string | null): string | null {
  if (!branch) return null;
  return (
    /^(?:feature|bugfix|hotfix)\/(?:[^/]+\/)?([A-Z][A-Z0-9_]+-\d+)(?:-|$)/.exec(branch)?.[1] ?? null
  );
}

export interface TicketReview {
  key: string;
  /** What the change will contain, as specgate read the ticket; null when it could not. */
  ticket: {
    summary: string;
    type: string;
    intent: string | null;
    url: string | null;
    criteria: string[];
    questions: string[];
  } | null;
  /** specgate says the ticket can be drafted. */
  ready: boolean;
  /** The capability the change opens in, when specgate knows it. */
  capability: string | null;
  findings: Finding[];
  /** The branch it opens on when the project is on the ticket's already; null when specgate makes it. */
  onBranch: string | null;
  /** What runs once the Developer confirms: pushing the branch, or not yet. */
  open: { push: SpecgateCommand; noPush: SpecgateCommand };
  /** The same, as the person would type it. */
  shown: { push: string; noPush: string };
}

/**
 * The review of a ticket before its change opens (REQ-084, A6): what
 * `propose --from-ticket <KEY> --check --json` answered, the branch it opens
 * on, and the command a confirmation runs — `--no-branch` on the ticket's
 * branch already, `--no-push` for "Don't push yet".
 */
export function ticketReview(
  key: string,
  answer: { data: unknown; findings: Finding[]; exitCode?: number },
  branch: string | null,
): TicketReview {
  const data = (answer.data ?? {}) as {
    ticket?: Record<string, unknown> | null;
    ready?: unknown;
    capability?: unknown;
  };
  const t = data.ticket;
  const strings = (v: unknown) =>
    (Array.isArray(v) ? v : [])
      .map((x) => (typeof x === "string" ? x : str((x as { text?: unknown })?.text)))
      .filter((x): x is string => !!x);
  const onBranch = ticketOfBranch(branch) === key ? branch : null;
  const open = (noPush: boolean): SpecgateCommand => ({
    name: "propose-ticket",
    key,
    ...(onBranch ? { noBranch: true } : {}),
    ...(noPush ? { noPush: true } : {}),
  });
  return {
    key,
    ticket: t
      ? {
          summary: str(t.summary) ?? key,
          type: str(t.type) ?? "",
          intent: str(t.intent),
          url: str(t.url),
          criteria: strings(t.criteria),
          questions: strings(t.questions),
        }
      : null,
    ready: !!t && data.ready === true,
    capability: str(data.capability),
    findings: answer.findings,
    onBranch,
    open: { push: open(false), noPush: open(true) },
    shown: {
      push: shown(commandLine(open(false))?.args ?? []),
      noPush: shown(commandLine(open(true))?.args ?? []),
    },
  };
}

/** A finding as one line of the terminal, from its JSON — never specgate's prose. */
export function findingLine(f: Finding): string {
  const mark = f.severity === "error" ? "✖" : f.severity === "warning" ? "!" : "·";
  return `${mark} ${f.code}  ${f.target ? `${f.target}  ` : ""}${f.message}\n${
    f.fix ? `  fix: ${f.fix}\n` : ""
  }`;
}
