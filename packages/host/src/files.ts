/** The project's files, by paths relative to it with `/`. */
export interface ProjectFiles {
  list(): Promise<string[]>;
  read(path: string): Promise<string>;
  /** Only when the person saves (draft-editor REQ-045). */
  write?(path: string, text: string): Promise<void>;
  /**
   * One folder's entries (`""` is the root), what is ignored left out
   * (draft-explorer-tree REQ-161, REQ-167): only that folder is read.
   */
  children?(dir: string): Promise<Array<{ name: string; dir: boolean }>>;
  /**
   * The tree's writes (REQ-166): each refuses — writing nothing — a path whose
   * real location, links resolved, is outside the project (`OutsideProject`),
   * and never overwrites (`AlreadyExists`).
   */
  create?(path: string, dir: boolean): Promise<void>;
  rename?(from: string, to: string): Promise<void>;
  /** To the system's trash, or for good when `permanent`. */
  remove?(path: string, permanent: boolean): Promise<void>;
}

/** Why the file port refused a write (REQ-166): the codes its errors carry. */
export const FILE_REFUSALS = ["outside", "exists", "missing"] as const;
export type FileRefusal = (typeof FILE_REFUSALS)[number];

/** A path inside the project: relative, `/`-separated, never climbing out of it. */
export function insideProject(p: unknown): p is string {
  return (
    typeof p === "string" &&
    p.length > 0 &&
    p.length <= 4096 &&
    !p.startsWith("/") &&
    !/^[a-zA-Z]:/.test(p) &&
    !p.includes("\\") &&
    !p.includes("\0") &&
    !p.split("/").includes("..") &&
    !p.split("/").includes("")
  );
}
