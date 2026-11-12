import { Scrollback } from "../domain/terminal.js";
import type { Pty, PtyPort, Shell } from "../ports/PtyPort.js";

/** How many lines each terminal keeps (draft-terminal A7). */
export const SCROLLBACK_LINES = 10_000;

/** How long closing waits for a killed shell to exit before it stops waiting. */
export const EXIT_WAIT_MS = 5_000;

interface Open {
  id: string;
  name: string;
  pty: Pty;
  scrollback: Scrollback;
  /** Settles once the shell has exited. */
  exited: Promise<void>;
}

/**
 * The Developer's terminals (draft-terminal): several at once, each its own
 * pty running their shell in the project's folder (REQ-051, REQ-055), each
 * with its own scrollback, never mixed with another's (REQ-056). The studio's
 * own commands never go here: they run through Commands, with no shell (REQ-054).
 */
export class Terminals {
  private readonly open_ = new Map<string, Open>();
  private readonly counters = new Map<string, number>();
  private next = 1;
  private readonly dataListeners = new Set<(id: string, data: string) => void>();
  private readonly exitListeners = new Set<(id: string, code: number) => void>();

  constructor(
    private readonly port: PtyPort,
    private readonly where: { cwd: string; shell: Shell },
    private readonly options: { exitWaitMs?: number } = {},
  ) {}

  /** A terminal in the project's folder, or in `sub`, a folder inside it (draft-explorer-tree A15). */
  open(cols: number, rows: number, sub?: string): { id: string; name: string } {
    const id = `t${this.next++}`;
    const n = (this.counters.get(this.where.shell.name) ?? 0) + 1;
    this.counters.set(this.where.shell.name, n);
    const name = `${this.where.shell.name} ${n}`;
    const cwd = sub ? inFolder(this.where.cwd, sub) : this.where.cwd;
    const pty = this.port.spawn({ cwd, cols, rows, shell: this.where.shell });
    let exited!: () => void;
    const t: Open = {
      id,
      name,
      pty,
      scrollback: new Scrollback(SCROLLBACK_LINES),
      exited: new Promise<void>((ok) => (exited = ok)),
    };
    this.open_.set(id, t);
    pty.onData((data) => {
      t.scrollback.push(data);
      for (const l of this.dataListeners) l(id, data);
    });
    pty.onExit((code) => {
      exited();
      this.open_.delete(id);
      for (const l of this.exitListeners) l(id, code);
    });
    return { id, name };
  }

  list(): Array<{ id: string; name: string }> {
    return [...this.open_.values()].map(({ id, name }) => ({ id, name }));
  }

  input(id: string, data: string): void {
    this.get(id).pty.write(data);
  }

  resize(id: string, cols: number, rows: number): void {
    this.get(id).pty.resize(cols, rows);
  }

  scrollback(id: string): string {
    return this.get(id).scrollback.text();
  }

  /** Kills the terminal's shell; settles once it has exited, or after EXIT_WAIT_MS. */
  close(id: string): Promise<void> {
    const t = this.get(id);
    this.open_.delete(id);
    t.pty.kill();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const waited = new Promise<void>((ok) => {
      timer = setTimeout(ok, this.options.exitWaitMs ?? EXIT_WAIT_MS);
    });
    return Promise.race([t.exited, waited]).finally(() => clearTimeout(timer));
  }

  /**
   * Closes every terminal and waits for their shells to exit: on Windows a
   * shell still running holds the project's folder.
   */
  async closeAll(): Promise<void> {
    await Promise.all([...this.open_.keys()].map((id) => this.close(id)));
  }

  onData(listener: (id: string, data: string) => void): () => void {
    this.dataListeners.add(listener);
    return () => this.dataListeners.delete(listener);
  }

  onExit(listener: (id: string, code: number) => void): () => void {
    this.exitListeners.add(listener);
    return () => this.exitListeners.delete(listener);
  }

  private get(id: string): Open {
    const t = this.open_.get(id);
    if (!t) throw new Error(`no terminal ${id}`);
    return t;
  }
}

/** `sub` (relative, `/`) inside `root`, with the separator `root` uses: `\\` on Windows. */
export function inFolder(root: string, sub: string): string {
  const sep = root.includes("\\") && !root.includes("/") ? "\\" : "/";
  const parts = sub.split("/").filter(Boolean);
  return [root.replace(/[\\/]+$/, ""), ...parts].join(sep);
}
