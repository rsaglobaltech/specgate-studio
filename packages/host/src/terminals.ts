import { Terminals, folderLabel, type PtyPort, type Shell } from "@specgate-studio/core";
import type { Notifications } from "@specgate-studio/protocol";
import { insideProject } from "./files.js";

type Broadcast = <N extends keyof Notifications>(method: N, params: Notifications[N]) => void;
type Refuse = (message: string) => Error;

/** The pty and shell the host opens terminals with (draft-terminal). */
export interface TerminalWiring {
  pty: PtyPort;
  shell: Shell;
  /** The Developer's home folder, shown as `~` (draft-workbench-v2 REQ-184). */
  home?: string;
}

const isSize = (n: unknown): n is number =>
  Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 1000;

/**
 * The Developer's terminals in the host (draft-terminal): `terminal.open`,
 * `input`, `resize`, `close`, `list` and `scrollback`, each terminal's output
 * told to every UI as it is written (REQ-051, REQ-055, REQ-056). Only the
 * studio's own page reaches these (the host's Origin check): they are a shell.
 */
export function attachTerminals(
  projectDir: string,
  wiring: TerminalWiring,
  broadcast: Broadcast,
  refuse: Refuse,
  isFolder: (dir: string) => Promise<boolean> = async () => false,
): { handlers: Record<string, (params: unknown) => Promise<unknown>>; close(): Promise<void> } {
  const terminals = new Terminals(wiring.pty, { cwd: projectDir, shell: wiring.shell });
  terminals.onData((id, data) => broadcast("terminal.data", { id, data }));
  terminals.onExit((id, code) => broadcast("terminal.exit", { id, code }));
  const known = (id: unknown): id is string =>
    typeof id === "string" && terminals.list().some((t) => t.id === id);
  const handlers: Record<string, (params: unknown) => Promise<unknown>> = {
    "terminal.open": async (params) => {
      const { cols, rows, cwd } = (params ?? {}) as {
        cols?: unknown;
        rows?: unknown;
        cwd?: unknown;
      };
      if (!isSize(cols) || !isSize(rows)) throw refuse("cols and rows between 1 and 1000");
      if (cwd === undefined || cwd === "") return terminals.open(cols, rows);
      // In a folder of the project only: never one outside it (draft-explorer-tree REQ-166, A15).
      if (!insideProject(cwd) || !(await isFolder(cwd)))
        throw refuse("not a folder of the project");
      return terminals.open(cols, rows, cwd);
    },
    "terminal.input": async (params) => {
      const { id, data } = (params ?? {}) as { id?: unknown; data?: unknown };
      if (!known(id) || typeof data !== "string" || data.length > 65_536)
        throw refuse("no such terminal, or no text");
      terminals.input(id, data);
      return {};
    },
    "terminal.resize": async (params) => {
      const { id, cols, rows } = (params ?? {}) as { id?: unknown; cols?: unknown; rows?: unknown };
      if (!known(id) || !isSize(cols) || !isSize(rows)) throw refuse("no such terminal, or size");
      terminals.resize(id, cols, rows);
      return {};
    },
    "terminal.close": async (params) => {
      const id = (params as { id?: unknown } | null)?.id;
      if (!known(id)) throw refuse("no such terminal");
      void terminals.close(id);
      return {};
    },
    "terminal.list": async () => terminals.list(),
    // The shell and the folder the panel names beside "+" (draft-workbench-v2 REQ-184).
    "terminal.shell": async () => ({
      name: wiring.shell.name,
      folder: folderLabel(projectDir, wiring.home ?? ""),
    }),
    "terminal.scrollback": async (params) => {
      const id = (params as { id?: unknown } | null)?.id;
      if (!known(id)) throw refuse("no such terminal");
      return { data: terminals.scrollback(id) };
    },
  };
  return { handlers, close: () => terminals.closeAll() };
}
