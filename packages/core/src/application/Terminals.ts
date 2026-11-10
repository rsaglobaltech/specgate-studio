import { Scrollback } from "../domain/terminal.js";
import type { Pty, PtyPort, Shell } from "../ports/PtyPort.js";

/** How many lines each terminal keeps (draft-terminal A7). */
export const SCROLLBACK_LINES = 10_000;

interface Open {
  id: string;
  name: string;
  pty: Pty;
  scrollback: Scrollback;
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
  ) {}

  open(cols: number, rows: number): { id: string; name: string } {
    const id = `t${this.next++}`;
    const n = (this.counters.get(this.where.shell.name) ?? 0) + 1;
    this.counters.set(this.where.shell.name, n);
    const name = `${this.where.shell.name} ${n}`;
    const pty = this.port.spawn({ cwd: this.where.cwd, cols, rows, shell: this.where.shell });
    const t: Open = { id, name, pty, scrollback: new Scrollback(SCROLLBACK_LINES) };
    this.open_.set(id, t);
    pty.onData((data) => {
      t.scrollback.push(data);
      for (const l of this.dataListeners) l(id, data);
    });
    pty.onExit((code) => {
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

  close(id: string): void {
    const t = this.get(id);
    this.open_.delete(id);
    t.pty.kill();
  }

  closeAll(): void {
    for (const id of [...this.open_.keys()]) this.close(id);
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
