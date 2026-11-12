/**
 * The Developer's folders, for "Open Folder" and "Clone Repository" when no
 * folder is open (draft-workbench-v2 REQ-185): absolute paths of this machine.
 */
export interface FoldersPort {
  /** The Developer's home folder: where choosing starts. */
  home(): string;
  /** The folders inside `dir`, by name, sorted; none when it cannot be read. */
  folders(dir: string): Promise<string[]>;
  /** The folder above `dir`, or null at the top. */
  parent(dir: string): string | null;
  join(dir: string, name: string): string;
  exists(path: string): Promise<boolean>;
}

/** A program run in a folder, its output as it comes; resolves with its exit code. */
export interface ProgramPort {
  run(
    program: string,
    args: readonly string[],
    cwd: string,
    onOutput: (chunk: string) => void,
  ): Promise<number>;
}
