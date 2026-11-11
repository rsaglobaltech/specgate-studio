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

/**
 * Driven port: what Build writes to git, each only once the Developer
 * confirmed it (draft-build-live REQ-102). Output is handed over as git
 * writes it; the promise is the exit code.
 */
export interface GitWriter {
  /** One commit of exactly these files (relative, `/`) with the message. */
  commit(
    root: string,
    files: readonly string[],
    message: string,
    onOutput: (chunk: string) => void,
  ): Promise<number>;
  /** Every uncommitted file stashed, untracked ones included (`git stash --include-untracked`). */
  stash(root: string, message: string, onOutput: (chunk: string) => void): Promise<number>;
}
