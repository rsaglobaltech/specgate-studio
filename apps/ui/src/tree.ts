import type { GitLetter, TreeEntry } from "@specgate-studio/protocol";

/**
 * The Explorer's rows (draft-explorer-tree), worked out from what the host
 * answered: the open folders' entries in order (REQ-161), the filter's
 * matches inside their folders (REQ-167), each file's type (REQ-162), the
 * specification marked, git's letters and dots (REQ-163), and the modules
 * with their requirements (REQ-169). Plain functions, tested without a browser.
 */

export interface Row {
  entry: TreeEntry;
  depth: number;
}

/** Every folder above a path, the outermost first (REQ-164). */
export function foldersAbove(path: string): string[] {
  const parts = path.split("/").filter(Boolean);
  const out: string[] = [];
  for (let i = 1; i < parts.length; i++) out.push(parts.slice(0, i).join("/"));
  return out;
}

/** The folder a path is in (`""` for the root). */
export function parentOf(path: string): string {
  const at = path.lastIndexOf("/");
  return at < 0 ? "" : path.slice(0, at);
}

/** The rows of the tree: each open folder's entries under it, read so far. */
export function visibleRows(
  open: ReadonlySet<string>,
  children: ReadonlyMap<string, readonly TreeEntry[]>,
): Row[] {
  const rows: Row[] = [];
  const walk = (dir: string, depth: number) => {
    for (const entry of children.get(dir) ?? []) {
      rows.push({ entry, depth });
      if (entry.dir && open.has(entry.path)) walk(entry.path, depth + 1);
    }
  };
  walk("", 0);
  return rows;
}

const compare = (a: TreeEntry, b: TreeEntry) =>
  a.dir !== b.dir
    ? a.dir
      ? -1
      : 1
    : a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || a.name.localeCompare(b.name);

/**
 * The filter's rows (REQ-167, A17): the files whose path holds the text,
 * without case, each under every folder above it, opened; folders with no
 * match are left out. Ignored files never reach here: the host leaves them
 * out of its list.
 */
export function filteredRows(files: readonly string[], query: string): Row[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const kids = new Map<string, Map<string, TreeEntry>>();
  const add = (dir: string, entry: TreeEntry) => {
    let m = kids.get(dir);
    if (!m) kids.set(dir, (m = new Map()));
    m.set(entry.name, entry);
  };
  for (const f of files) {
    if (!f.toLowerCase().includes(q)) continue;
    const parts = f.split("/");
    for (let i = 0; i < parts.length; i++) {
      const path = parts.slice(0, i + 1).join("/");
      add(parts.slice(0, i).join("/"), { name: parts[i]!, path, dir: i < parts.length - 1 });
    }
  }
  const rows: Row[] = [];
  const walk = (dir: string, depth: number) => {
    for (const entry of [...(kids.get(dir)?.values() ?? [])].sort(compare)) {
      rows.push({ entry, depth });
      if (entry.dir) walk(entry.path, depth + 1);
    }
  };
  walk("", 0);
  return rows;
}

/** The type badge of a file, as the boards draw it (`MD`), or null for a plain file (A6). */
export function fileType(name: string): string | null {
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1).toLowerCase() : "";
  const types: Record<string, string> = {
    md: "MD",
    markdown: "MD",
    ts: "TS",
    tsx: "TS",
    mts: "TS",
    cts: "TS",
    js: "JS",
    jsx: "JS",
    mjs: "JS",
    cjs: "JS",
    json: "JSON",
    yaml: "YAML",
    yml: "YAML",
    feature: "FT",
    java: "JAVA",
    py: "PY",
    css: "CSS",
    html: "HTML",
    png: "IMG",
    jpg: "IMG",
    jpeg: "IMG",
    gif: "IMG",
    svg: "IMG",
    webp: "IMG",
  };
  return types[ext] ?? null;
}

/** Whether a path is the specification: spec.md at the root, docs/specs, features (REQ-162). */
export function isSpec(path: string): boolean {
  return (
    path === "spec.md" ||
    path === "docs/specs" ||
    path.startsWith("docs/specs/") ||
    path === "features" ||
    path.startsWith("features/")
  );
}

/** The folders holding a changed file: each gets a dot (REQ-163). */
export function changedFolders(changes: Readonly<Record<string, GitLetter>>): Set<string> {
  const out = new Set<string>();
  for (const f of Object.keys(changes)) for (const d of foldersAbove(f)) out.add(d);
  return out;
}

/** A requirement as Home's status lists it. */
export interface StatusRequirement {
  id: string;
  title: string | null;
  category?: string;
  change?: string | null;
}

/** A requirement's dot (REQ-169, A26): proven, building, waiting for an answer, draft, to do. */
export type ReqState = "proven" | "building" | "waiting" | "draft" | "todo";

export interface Module {
  name: string;
  built: number;
  requirements: Array<StatusRequirement & { state: ReqState }>;
}

/**
 * The modules and their requirements (REQ-169, A26): a requirement of an open
 * change belongs to the change's module (`draft-pedidos` → pedidos); one of
 * the spec to the folder of its feature (`features/auth/…` → auth), as
 * `report --json` names it; any other to "spec".
 */
export function modulesOf(
  requirements: readonly StatusRequirement[],
  report: unknown,
  opts: { building?: string | null; unapproved?: ReadonlySet<string> } = {},
): Module[] {
  const featureOf = new Map<string, string>();
  const rows = (report as { requirements?: unknown } | null)?.requirements;
  for (const r of Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : []) {
    const id = typeof r.requirement === "string" ? r.requirement : null;
    const file = typeof r.featureFile === "string" ? r.featureFile.replace(/`/g, "") : "";
    const m = /^features\/([^/]+)\//.exec(file);
    if (id && m) featureOf.set(id, m[1]!);
  }
  const modules = new Map<string, Module>();
  for (const r of requirements) {
    const name = r.change ? r.change.replace(/^draft-/, "") : (featureOf.get(r.id) ?? "spec");
    let m = modules.get(name);
    if (!m) modules.set(name, (m = { name, built: 0, requirements: [] }));
    const done = r.category === "DONE";
    if (done) m.built++;
    const state: ReqState =
      r.id === opts.building
        ? "building"
        : done
          ? "proven"
          : r.category === "WAITING_FOR_ANSWER"
            ? "waiting"
            : r.change && opts.unapproved?.has(r.change)
              ? "draft"
              : "todo";
    m.requirements.push({ ...r, state });
  }
  return [...modules.values()];
}
