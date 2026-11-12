import { toPosix } from "./workspace.js";

/**
 * The Explorer's tree (draft-explorer-tree): one folder read at a time
 * (REQ-161), its entries in VS Code's order, git's letters (REQ-163), the
 * names a write may use and where it lands (REQ-166). Plain data and rules —
 * the host reads the folders, the UI draws them.
 */

/** One entry of a folder: its name, its path from the project's root with `/`. */
export interface TreeEntry {
  name: string;
  path: string;
  dir: boolean;
  /** Named by `.gitignore` or the studio's ignore rules: shown dimmed, never hidden (draft-workbench-v2 REQ-186). */
  ignored?: true;
}

/** Git's letter on a changed file (REQ-163, A8): modified, untracked, added. */
export type GitLetter = "M" | "U" | "A";

/** Folders first, then files, each by name without case, as VS Code orders them (A3). */
export function sortEntries<T extends { name: string; dir: boolean }>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) =>
    a.dir !== b.dir
      ? a.dir
        ? -1
        : 1
      : a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || a.name.localeCompare(b.name),
  );
}

/** The path of `name` inside the folder `dir` (`""` is the project's root). */
export function childPath(dir: string, name: string): string {
  const d = toPosix(dir);
  return d ? `${d}/${name}` : name;
}

/** The folder a path is in (`""` for the root). */
export function parentOf(path: string): string {
  const p = toPosix(path);
  const at = p.lastIndexOf("/");
  return at < 0 ? "" : p.slice(0, at);
}

/** Every folder above a path, the outermost first: `a`, `a/b` for `a/b/c.md` (REQ-164). */
export function foldersAbove(path: string): string[] {
  const parts = toPosix(path).split("/").filter(Boolean);
  const out: string[] = [];
  for (let i = 1; i < parts.length; i++) out.push(parts.slice(0, i).join("/"));
  return out;
}

/**
 * A name a new or renamed file may take (REQ-166): not empty, not `.` or
 * `..`, no `/` or `\`, none of the characters Windows refuses, no control
 * character, and not ending in a space or a dot (Windows drops them).
 */
export function validName(name: string): boolean {
  if (!name || name === "." || name === "..") return false;
  if (/[/\\<>:"|?*]/.test(name)) return false;
  for (const ch of name) if (ch.charCodeAt(0) < 32) return false;
  return !/[ .]$/.test(name);
}

/**
 * Git's letter for one entry of `git status --porcelain=v1` (A8): `??` is
 * untracked, an `A` in the index is added, any other change (modified,
 * renamed, copied, type-changed) in the index or the working tree is
 * modified. A deleted file is not in the tree, so it has none.
 */
export function letterOf(xy: string): GitLetter | null {
  const x = xy[0] ?? " ";
  const y = xy[1] ?? " ";
  if (xy === "??") return "U";
  if (x === "D" || (y === "D" && x === " ")) return null;
  if (x === "A") return "A";
  if ("MRCT".includes(x) || "MT".includes(y)) return "M";
  return null;
}

/** The folders that hold a changed file, each with a dot (REQ-163). */
export function foldersWithChanges(changes: Readonly<Record<string, GitLetter>>): Set<string> {
  const out = new Set<string>();
  for (const file of Object.keys(changes)) for (const f of foldersAbove(file)) out.add(f);
  return out;
}

/** The folders a project keeps open, by project (REQ-161, A4). */
export type OpenFolders = Record<string, string[]>;

/** The store's key for the folders left open. */
export const OPEN_FOLDERS_KEY = "explorer-open";

/**
 * What the tree never shows, as VS Code's `files.exclude` default (draft-workbench-v2
 * REQ-186, A11): `.git`. Everything else ignored is shown dimmed.
 */
export const EXCLUDED_NAMES: ReadonlySet<string> = new Set([".git"]);

/** The store's key for each project's layout (draft-workbench-v2 REQ-191, A24). */
export const LAYOUTS_KEY = "workbench-layouts";

/** How many open folders are kept per project, at most. */
export const OPEN_FOLDERS_LIMIT = 500;

/** The open folders kept for a project: each once, inside the project, at most 500. */
export function cleanOpenFolders(open: unknown): string[] {
  if (!Array.isArray(open)) return [];
  const seen = new Set<string>();
  for (const f of open) {
    if (typeof f !== "string") continue;
    const p = toPosix(f);
    if (!p || p.startsWith("/") || /^[a-zA-Z]:/.test(p) || p.split("/").includes("..")) continue;
    seen.add(p);
    if (seen.size >= OPEN_FOLDERS_LIMIT) break;
  }
  return [...seen];
}
