import * as path from "node:path";
import { WebSocketServer, type WebSocket } from "ws";
import {
  Commands,
  ProjectState,
  SECTIONS,
  type ProcessRunner,
  type Section,
  type SectionReader,
  type SpecgateCommand,
} from "@specgate-studio/core";
import { RPC_ERRORS, type Notifications, type ProjectOpened } from "@specgate-studio/protocol";

export interface HostOptions {
  projectDir: string;
  reader: SectionReader;
  runner: ProcessRunner;
  /** 0 picks a free port. */
  port: number;
}

export interface Host {
  /** `ws://127.0.0.1:<port>/` */
  url: string;
  state: ProjectState;
  close(): Promise<void>;
}

/**
 * The core host of one open project (REQ-001): its state and its commands,
 * served as JSON-RPC 2.0 over a WebSocket on 127.0.0.1 — the same transport for
 * the desktop sidecar and the browser (Q1). Every connected UI shares the one
 * state, so a second tab or a reload reads nothing again (REQ-002), and every
 * UI is told of command events and state changes.
 */
export async function startHost(options: HostOptions): Promise<Host> {
  const state = new ProjectState(options.reader);
  const commands = new Commands(options.runner);
  const opening = state.open();
  opening.catch(() => undefined);

  const server = new WebSocketServer({ host: "127.0.0.1", port: options.port });
  await new Promise<void>((ok, ko) => server.once("listening", ok).once("error", ko));

  const broadcast = <N extends keyof Notifications>(method: N, params: Notifications[N]) => {
    const text = JSON.stringify({ jsonrpc: "2.0", method, params });
    for (const ws of server.clients) if (ws.readyState === ws.OPEN) ws.send(text);
  };
  commands.onEvent((event) => broadcast("command.event", event));
  state.onChange((sections) => broadcast("state.changed", { sections }));

  const handlers: Record<string, (params: unknown) => Promise<unknown>> = {
    "project.open": async () => {
      await opening;
      const sections: ProjectOpened["sections"] = {};
      for (const s of SECTIONS) sections[s] = await state.section(s);
      return { project: path.basename(options.projectDir), sections } satisfies ProjectOpened;
    },
    "section.get": async (params) => {
      const section = (params as { section?: unknown } | null)?.section;
      if (!SECTIONS.includes(section as Section))
        throw rpcError(RPC_ERRORS.params, "unknown section");
      return state.section(section as Section);
    },
    "command.run": async (params) => commands.run(params as SpecgateCommand),
  };

  server.on("connection", (ws: WebSocket) => {
    ws.on("message", async (raw) => {
      let id: number | null = null;
      try {
        const message = JSON.parse(String(raw)) as {
          id?: unknown;
          method?: unknown;
          params?: unknown;
        };
        id = typeof message.id === "number" ? message.id : null;
        if (id === null || typeof message.method !== "string") {
          throw rpcError(RPC_ERRORS.invalid, "not a JSON-RPC request");
        }
        const handler = Object.prototype.hasOwnProperty.call(handlers, message.method)
          ? handlers[message.method]
          : undefined;
        if (!handler) throw rpcError(RPC_ERRORS.method, `no method ${message.method}`);
        const result = await handler(message.params ?? {});
        ws.send(JSON.stringify({ jsonrpc: "2.0", id, result }));
      } catch (e) {
        const error =
          e instanceof SyntaxError
            ? { code: RPC_ERRORS.parse, message: "not JSON" }
            : isRpcError(e)
              ? { code: e.code, message: e.message }
              : { code: -32000, message: e instanceof Error ? e.message : String(e) };
        ws.send(JSON.stringify({ jsonrpc: "2.0", id, error }));
      }
    });
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : options.port;
  return {
    url: `ws://127.0.0.1:${port}/`,
    state,
    close: () =>
      new Promise<void>((ok) => {
        for (const ws of server.clients) ws.terminate();
        server.close(() => ok());
      }),
  };
}

interface RpcError extends Error {
  code: number;
}

function rpcError(code: number, message: string): RpcError {
  return Object.assign(new Error(message), { code });
}

function isRpcError(e: unknown): e is RpcError {
  return e instanceof Error && typeof (e as Partial<RpcError>).code === "number";
}
