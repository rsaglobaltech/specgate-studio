import { toPosix } from "./workspace.js";

/**
 * A specgate 1.0 workspace as the studio shows it (workspace-repos REQ-218):
 * read from `specgate workspace status --json`'s `workspace`, never from
 * `specgate.workspace.yaml` itself — specgate is the one that knows its
 * repositories, where they are and how far each has got.
 */

export interface WorkspaceRepo {
  name: string;
  /** `service`, `web`, `library`, `contracts`. */
  role: string;
  /** As the workspace names it, relative to it: `../truck-fleet`. */
  path: string;
  /** Where it is on this machine, with `/`: what "Open" opens. */
  dir: string;
  /** Where to clone it from when it is not there; null when the workspace gives none. */
  url: string | null;
  /** The folder is there. */
  exists: boolean;
  branch: string | null;
  /** Its requirements, as its own `status` counts them; null when it could not be read. */
  requirements: { total: number; done: number } | null;
  /** Its last gate: `passed`, `failed`, `not run`. */
  gate: string | null;
}

export interface WorkspaceView {
  name: string;
  repos: WorkspaceRepo[];
  /** The stories the workspace holds. */
  stories: number;
}

const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** `base` joined with a relative `path`, `..` resolved, with `/` (A7). */
export function joinPath(base: string, path: string): string {
  const p = toPosix(path);
  if (/^([A-Za-z]:)?\//.test(p)) return p;
  const parts = toPosix(base).split("/");
  for (const part of p.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (parts.length > 1) parts.pop();
    } else parts.push(part);
  }
  return parts.join("/");
}

/** The workspace of `workspace status --json`, its repositories' folders from `root`; null when it is none. */
export function workspaceOf(answer: unknown, root: string): WorkspaceView | null {
  const w = (answer as { workspace?: unknown } | null)?.workspace as
    { name?: unknown; repos?: unknown; stories?: unknown } | null | undefined;
  if (!w || typeof w !== "object" || !Array.isArray(w.repos)) return null;
  const repos = w.repos
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && !!str(r.name))
    .map((r): WorkspaceRepo => {
      const path = str(r.path) ?? str(r.name)!;
      const reqs = r.requirements as { total?: unknown; done?: unknown } | null | undefined;
      const total = num(reqs?.total);
      return {
        name: str(r.name)!,
        role: str(r.role) ?? "service",
        path,
        dir: joinPath(root, path),
        url: str(r.url),
        exists: r.exists === true,
        branch: str(r.branch),
        requirements: total === null ? null : { total, done: num(reqs?.done) ?? 0 },
        gate: str((r.gate as { state?: unknown } | null | undefined)?.state),
      };
    });
  return {
    name: str(w.name) ?? "",
    repos,
    stories: Array.isArray(w.stories) ? w.stories.length : 0,
  };
}
