/**
 * The open project as a folder (draft-workspace): what kind of folder it is,
 * what is never watched, the branch's team and ticket, the uncommitted files
 * by folder, and the recent projects. Pure functions; paths are relative to
 * the project, with `/` (assumption A7).
 */

/** What a folder holds (REQ-021, A1). */
export type FolderKind = "empty" | "code" | "specgate";

/** How each kind reads (A1). */
export const FOLDER_KIND_LABEL: Record<FolderKind, string> = {
  empty: "Empty folder",
  code: "Code, no specgate project",
  specgate: "Specgate project",
};

/** The file whose presence makes a folder a specgate project (A1). */
export const SPECGATE_MARKER = "docs/specs/traceability.md";

/**
 * The kind of a folder from its top-level entries and whether it holds
 * `docs/specs/traceability.md`. A folder of nothing but `.git` is empty.
 */
export function folderKind(entries: readonly string[], hasMarker: boolean): FolderKind {
  if (hasMarker) return "specgate";
  return entries.every((e) => e === ".git") ? "empty" : "code";
}

/** A path with `/`, without `./` or a trailing `/`. */
export function toPosix(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
}

/** The folders never watched, listed or counted, at any depth (REQ-022, A2). */
export const IGNORED_FOLDERS: readonly string[] = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  "target",
  ".next",
  "coverage",
];

/**
 * What a project never watches, lists or counts: the folders of A2 at any
 * depth, and the folders its `.gitignore` names — a bare name at any depth,
 * a path with `/` from the project's root. Patterns with wildcards or a `!`
 * are left to git.
 */
export class IgnoreRules {
  private readonly names: Set<string>;
  private readonly paths: string[];

  constructor(gitignore = "") {
    this.names = new Set(IGNORED_FOLDERS);
    this.paths = [];
    for (const raw of gitignore.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#") || line.startsWith("!") || /[*?[\]]/.test(line)) continue;
      const clean = line.replace(/^\/+/, "").replace(/\/+$/, "");
      if (!clean) continue;
      const anchored = line.startsWith("/") || clean.includes("/");
      if (anchored) this.paths.push(clean);
      else this.names.add(clean);
    }
  }

  /** Whether a path of the project is ignored (it, or a folder it is in). */
  ignores(path: string): boolean {
    const p = toPosix(path);
    if (!p) return false;
    const parts = p.split("/");
    if (parts.some((part) => this.names.has(part))) return true;
    return this.paths.some((q) => p === q || p.startsWith(q + "/"));
  }
}

/** A branch's team and ticket, when it is named `feature/<team>/<KEY>` (REQ-024, A4). */
export function branchTicket(branch: string | null): { team: string; ticket: string } | null {
  const m = branch ? /^feature\/([^/]+)\/([A-Z][A-Z0-9]*-\d+)$/.exec(branch) : null;
  return m ? { team: m[1]!, ticket: m[2]! } : null;
}

/** The group of the specification's files (A5). */
export const SPECIFICATION_GROUP = "specification";

/** The group a file falls in: the specification, or its first two folders (A5). */
export function groupOf(path: string): string {
  const p = toPosix(path);
  if (p === "spec.md" || p.startsWith("docs/specs/") || p.startsWith("features/")) {
    return SPECIFICATION_GROUP;
  }
  const folders = p.split("/").slice(0, -1);
  return folders.length === 0 ? "." : folders.slice(0, 2).join("/");
}

export interface UncommittedGroup {
  group: string;
  files: number;
}

/**
 * The uncommitted files by folder (REQ-025): the largest group first, then
 * by name. A file counts once, and an ignored one not at all (REQ-022).
 */
export function groupUncommitted(
  files: readonly string[],
  rules: IgnoreRules = new IgnoreRules(),
): { uncommitted: UncommittedGroup[]; total: number } {
  const counted = new Set(files.map(toPosix).filter((f) => f && !rules.ignores(f)));
  const groups = new Map<string, number>();
  for (const f of counted) groups.set(groupOf(f), (groups.get(groupOf(f)) ?? 0) + 1);
  const uncommitted = [...groups]
    .map(([group, n]) => ({ group, files: n }))
    .sort((a, b) => b.files - a.files || a.group.localeCompare(b.group));
  return { uncommitted, total: counted.size };
}

export interface GitState {
  branch: string | null;
  team: string | null;
  ticket: string | null;
  uncommitted: UncommittedGroup[];
  total: number;
}

export interface WorkspaceState {
  root: string;
  name: string;
  kind: FolderKind;
  git: GitState | null;
}

export interface RecentProject {
  path: string;
  name: string;
  openedAt: string;
}

/** How many recent projects are kept (REQ-026). */
export const RECENT_LIMIT = 10;

/** A project's name: the last folder of its path. */
export function projectName(path: string): string {
  const parts = toPosix(path).split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

/** Whether two paths name the same folder — without case on Windows and macOS (A7). */
export function samePath(a: string, b: string, caseInsensitive: boolean): boolean {
  const x = toPosix(a);
  const y = toPosix(b);
  return caseInsensitive ? x.toLowerCase() === y.toLowerCase() : x === y;
}

/**
 * The recent projects after one was opened (REQ-026): it comes first, once,
 * and only the last 10 are kept.
 */
export function withOpened(
  recent: readonly RecentProject[],
  path: string,
  openedAt: string,
  caseInsensitive: boolean,
): RecentProject[] {
  const opened = { path: toPosix(path), name: projectName(path), openedAt };
  const rest = recent.filter((r) => !samePath(r.path, path, caseInsensitive));
  return [opened, ...rest].slice(0, RECENT_LIMIT);
}
