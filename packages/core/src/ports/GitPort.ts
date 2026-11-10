/**
 * Driven port: the project's git state (REQ-024, REQ-025). Both answer `null`
 * when the folder is not a git repository.
 */
export interface GitPort {
  /** The current branch's name; `null` outside a repository or detached. */
  branch(root: string): Promise<string | null>;
  /** Every uncommitted file — modified, added, deleted, renamed or untracked — relative, with `/`. */
  uncommitted(root: string): Promise<string[] | null>;
}
