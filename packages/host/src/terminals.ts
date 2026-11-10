import { Terminals, type PtyPort, type Shell } from "@specgate-studio/core";
import type { Notifications } from "@specgate-studio/protocol";

type Broadcast = <N extends keyof Notifications>(method: N, params: Notifications[N]) => void;
type Refuse = (message: string) => Error;

/** The pty and shell the host opens terminals with (draft-terminal). */
export interface TerminalWiring {
  pty: PtyPort;
  shell: Shell;
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
): { handlers: Record<string, (params: unknown) => Promise<unknown>>; close(): void } {
  const terminals = new Terminals(wiring.pty, { cwd: projectDir, shell: wiring.shell });
  terminals.onData((id, data) => broadcast("terminal.data", { id, data }));
  terminals.onExit((id, code) => broadcast("terminal.exit", { id, code }));
  const known = (id: unknown): id is string =>
    typeof id === "string" && terminals.list().some((t) => t.id === id);
  const handlers: Record<string, (params: unknown) => Promise<unknown>> = {
    "terminal.open": async (params) => {
      const { cols, rows } = (params ?? {}) as { cols?: unknown; rows?: unknown };
      if (!isSize(cols) || !isSize(rows)) throw refuse("cols and rows between 1 and 1000");
      return terminals.open(cols, rows);
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
      terminals.close(id);
      return {};
    },
    "terminal.list": async () => terminals.list(),
    "terminal.scrollback": async (params) => {
      const id = (params as { id?: unknown } | null)?.id;
      if (!known(id)) throw refuse("no such terminal");
      return { data: terminals.scrollback(id) };
    },
  };
  return { handlers, close: () => terminals.closeAll() };
}
