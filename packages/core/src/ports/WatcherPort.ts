/**
 * The path told when the system lost which files changed — on Windows a burst
 * such as `npm install` overflows the watch's buffer: anything may have
 * changed, and what depends on the files is read again (REQ-023).
 */
export const ANY_FILE = "*";

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
