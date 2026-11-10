import type { Shell } from "../domain/terminal.js";

export type { Shell };

export interface PtyOptions {
  cwd: string;
  cols: number;
  rows: number;
  shell: Shell;
}

/** One pseudo-terminal: a shell the Developer types into (draft-terminal REQ-051). */
export interface Pty {
  write(data: string): void;
  resize(cols: number, rows: number): void;
  onData(listener: (data: string) => void): void;
  onExit(listener: (exitCode: number) => void): void;
  kill(): void;
}

/** Starts pseudo-terminals: node-pty in the host for desktop and web (A10). */
export interface PtyPort {
  spawn(options: PtyOptions): Pty;
}
