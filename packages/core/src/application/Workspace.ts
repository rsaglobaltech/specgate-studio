import {
  branchTicket,
  folderKind,
  groupUncommitted,
  IgnoreRules,
  projectName,
  SPECGATE_MARKER,
  toPosix,
  type GitState,
  type WorkspaceState,
} from "../domain/workspace.js";
import type { FileSystemPort } from "../ports/FileSystemPort.js";
import type { GitPort } from "../ports/GitPort.js";
import type { Watch, WatcherPort } from "../ports/WatcherPort.js";

export type WorkspaceListener = (state: WorkspaceState) => void;

/**
 * The open folder (draft-workspace): what kind it is (REQ-021), what is never
 * watched (REQ-022), its branch and the team and ticket it names (REQ-024),
 * and its uncommitted files by folder (REQ-025) — read through ports only.
 */
export class Workspace {
  private constructor(
    readonly root: string,
    private readonly fs: FileSystemPort,
    private readonly git: GitPort,
    readonly rules: IgnoreRules,
  ) {}

  /** The folder at `root`, with the rules of its `.gitignore`. */
  static async open(root: string, fs: FileSystemPort, git: GitPort): Promise<Workspace> {
    const r = toPosix(root);
    const gitignore = (await fs.readText(`${r}/.gitignore`)) ?? "";
    return new Workspace(r, fs, git, new IgnoreRules(gitignore));
  }

  async state(): Promise<WorkspaceState> {
    const [entries, marker, git] = await Promise.all([
      this.fs.list(this.root),
      this.fs.exists(`${this.root}/${SPECGATE_MARKER}`),
      this.gitState(),
    ]);
    return {
      root: this.root,
      name: projectName(this.root),
      kind: folderKind(entries, marker),
      git,
    };
  }

  async gitState(): Promise<GitState | null> {
    const [branch, files] = await Promise.all([
      this.git.branch(this.root),
      this.git.uncommitted(this.root),
    ]);
    if (files === null) return null;
    const named = branchTicket(branch);
    return {
      branch,
      team: named?.team ?? null,
      ticket: named?.ticket ?? null,
      ...groupUncommitted(files, this.rules),
    };
  }

  /**
   * Watch the folder: every change outside the ignored folders is told to
   * `onFile` at once (REQ-023), and the new state to `onState` once the
   * changes settle — one read of git for a burst of saves.
   */
  async watch(
    watcher: WatcherPort,
    onFile: (path: string) => void,
    onState: WorkspaceListener,
    settleMs = 30,
  ): Promise<Watch> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const watch = await watcher.watch(
      this.root,
      (p) => this.rules.ignores(p),
      (path) => {
        if (this.rules.ignores(path)) return;
        onFile(path);
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          this.state().then(onState, () => undefined);
        }, settleMs);
      },
    );
    return {
      close: async () => {
        if (timer) clearTimeout(timer);
        await watch.close();
      },
    };
  }
}
