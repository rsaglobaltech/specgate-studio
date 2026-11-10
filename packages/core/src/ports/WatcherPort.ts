/** A watch that can be stopped. */
export interface Watch {
  close(): Promise<void>;
}

/**
 * Driven port: the project's file changes (REQ-022, REQ-023). Each change is
 * told as the changed path relative to the root, with `/`; a path `ignored`
 * answers true for is neither watched nor told.
 */
export interface WatcherPort {
  watch(
    root: string,
    ignored: (path: string) => boolean,
    onChange: (path: string) => void,
  ): Promise<Watch>;
}
