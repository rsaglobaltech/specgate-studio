import { toPosix } from "../domain/workspace.js";
import type { ClockPort } from "../ports/ClockPort.js";
import type { FileSystemPort } from "../ports/FileSystemPort.js";
import type { GitPort, GitWriter } from "../ports/GitPort.js";
import type { StorePort } from "../ports/StorePort.js";
import { GIT_STATE, type Watch, type WatcherPort } from "../ports/WatcherPort.js";

/** Files in memory, by absolute path with `/`; folders are implied by them. */
export class InMemoryFileSystem implements FileSystemPort {
  private readonly files = new Map<string, string>();
  private readonly folders = new Set<string>();

  constructor(files: Record<string, string> = {}, folders: string[] = []) {
    for (const [p, text] of Object.entries(files)) this.write(p, text);
    for (const f of folders) this.addFolder(toPosix(f));
  }

  write(path: string, text: string): void {
    const p = toPosix(path);
    this.files.set(p, text);
    this.addFolder(p.slice(0, p.lastIndexOf("/")));
  }

  private addFolder(folder: string): void {
    for (let f = folder; f; f = f.slice(0, Math.max(0, f.lastIndexOf("/")))) {
      this.folders.add(f);
      if (!f.includes("/")) break;
    }
  }

  async exists(path: string): Promise<boolean> {
    const p = toPosix(path);
    return this.files.has(p) || this.folders.has(p);
  }

  async list(path: string): Promise<string[]> {
    const prefix = toPosix(path) + "/";
    const names = new Set<string>();
    for (const p of [...this.files.keys(), ...this.folders]) {
      if (p.startsWith(prefix)) names.add(p.slice(prefix.length).split("/")[0]!);
    }
    return [...names].sort();
  }

  async readText(path: string): Promise<string | null> {
    return this.files.get(toPosix(path)) ?? null;
  }
}

/** Git state in memory, by root; what Build writes is recorded (draft-build-live). */
export class InMemoryGit implements GitPort, GitWriter {
  private readonly repos: Record<string, { branch: string | null; uncommitted: string[] }> = {};
  /** Every commit, in order. */
  readonly commits: Array<{ message: string; files: string[] }> = [];
  /** How many stashes were made. */
  stashes = 0;

  /** Repositories by their root, in either separator: kept with `/`, as they are looked up. */
  constructor(repos: Record<string, { branch: string | null; uncommitted: string[] }> = {}) {
    for (const [root, repo] of Object.entries(repos)) this.set(root, repo);
  }

  set(root: string, repo: { branch: string | null; uncommitted: string[] }): void {
    this.repos[toPosix(root)] = repo;
  }

  async branch(root: string): Promise<string | null> {
    return this.repos[toPosix(root)]?.branch ?? null;
  }

  async uncommitted(root: string): Promise<string[] | null> {
    const repo = this.repos[toPosix(root)];
    return repo ? [...repo.uncommitted] : null;
  }

  /** Each uncommitted file's two letters: as set with `status`, `" M"` otherwise. */
  async changes(root: string): Promise<Record<string, string> | null> {
    const repo = this.repos[toPosix(root)];
    if (!repo) return null;
    const status = this.status[toPosix(root)] ?? {};
    return Object.fromEntries(repo.uncommitted.map((f) => [f, status[f] ?? " M"]));
  }

  /** The two letters of some uncommitted files (`"??"` untracked, `"A "` added). */
  setStatus(root: string, status: Record<string, string>): void {
    this.status[toPosix(root)] = { ...this.status[toPosix(root)], ...status };
  }

  private readonly status: Record<string, Record<string, string>> = {};

  async commit(
    root: string,
    files: readonly string[],
    message: string,
    onOutput: (chunk: string) => void,
  ): Promise<number> {
    const repo = this.repos[toPosix(root)];
    if (!repo) return 128;
    const these = new Set(files);
    repo.uncommitted = repo.uncommitted.filter((f) => !these.has(f));
    this.commits.push({ message, files: [...files] });
    onOutput(`[${repo.branch ?? "HEAD"}] ${message}\n ${files.length} files changed\n`);
    return 0;
  }

  async stash(root: string, _message: string, onOutput: (chunk: string) => void): Promise<number> {
    const repo = this.repos[toPosix(root)];
    if (!repo) return 128;
    repo.uncommitted = [];
    this.stashes++;
    onOutput("Saved working directory and index state\n");
    return 0;
  }
}

/** A watcher whose changes are told by `emit`. */
export class InMemoryWatcher implements WatcherPort {
  private readonly watches = new Set<{
    root: string;
    ignored: (path: string) => boolean;
    onChange: (path: string) => void;
  }>();

  async watch(
    root: string,
    ignored: (path: string) => boolean,
    onChange: (path: string) => void,
  ): Promise<Watch> {
    const w = { root: toPosix(root), ignored, onChange };
    this.watches.add(w);
    return { close: async () => void this.watches.delete(w) };
  }

  /** Only git's state of `root` changed: a commit or a stage (draft-explorer-tree REQ-163). */
  emitGit(root: string): void {
    for (const w of this.watches) if (w.root === toPosix(root)) w.onChange(GIT_STATE);
  }

  /** A file of `root` changed. */
  emit(root: string, path: string): void {
    for (const w of this.watches) {
      if (w.root === toPosix(root) && !w.ignored(toPosix(path))) w.onChange(toPosix(path));
    }
  }
}

/** A store in memory. */
export class InMemoryStore implements StorePort {
  private readonly values = new Map<string, string>();

  async read<T>(key: string): Promise<T | null> {
    const v = this.values.get(key);
    return v === undefined ? null : (JSON.parse(v) as T);
  }

  async write<T>(key: string, value: T): Promise<void> {
    this.values.set(key, JSON.stringify(value));
  }
}

/** A clock that moves a minute on each call, from `start`. */
export class SteppingClock implements ClockPort {
  private t: number;

  constructor(start = "2026-11-10T09:00:00.000Z") {
    this.t = Date.parse(start);
  }

  now(): string {
    const at = new Date(this.t).toISOString();
    this.t += 60_000;
    return at;
  }
}
