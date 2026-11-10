import type { Pty, PtyOptions, PtyPort } from "../ports/PtyPort.js";

/** A pty that records what is typed and emits what a test says (draft-terminal). */
export class FakePty implements Pty {
  readonly written: string[] = [];
  killed = false;
  private readonly data = new Set<(d: string) => void>();
  private readonly exits = new Set<(c: number) => void>();
  size: [number, number];

  constructor(options: PtyOptions) {
    this.size = [options.cols, options.rows];
  }

  write(data: string): void {
    this.written.push(data);
  }
  resize(cols: number, rows: number): void {
    this.size = [cols, rows];
  }
  onData(listener: (data: string) => void): void {
    this.data.add(listener);
  }
  onExit(listener: (exitCode: number) => void): void {
    this.exits.add(listener);
  }
  kill(): void {
    this.killed = true;
  }
  /** What the shell prints. */
  emit(data: string): void {
    for (const l of this.data) l(data);
  }
  /** The shell exits. */
  exit(code: number): void {
    for (const l of this.exits) l(code);
  }
}

export class InMemoryPty implements PtyPort {
  readonly spawned: Array<PtyOptions & { pty: FakePty }> = [];

  spawn(options: PtyOptions): FakePty {
    const pty = new FakePty(options);
    this.spawned.push({ ...options, pty });
    return pty;
  }
}
