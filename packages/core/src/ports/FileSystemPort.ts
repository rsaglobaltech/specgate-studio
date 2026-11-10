/**
 * Driven port: the project's files (draft-workspace, A7). Paths are absolute,
 * with `/`; a missing file is `false` or `null`, never an error.
 */
export interface FileSystemPort {
  exists(path: string): Promise<boolean>;
  /** The names in a folder; `[]` when it does not exist. */
  list(path: string): Promise<string[]>;
  /** A text file's content, or `null` when it does not exist. */
  readText(path: string): Promise<string | null>;
}
