import { createServer } from "node:http";
import * as path from "node:path";
import { WebSocketServer, type WebSocket } from "ws";
import {
  Commands,
  checkSpecgate,
  ProjectState,
  type SpecgatePort,
  SECTIONS,
  type ProcessRunner,
  type Section,
  type SectionReader,
  type SpecgateCommand,
} from "@specgate-studio/core";
import { fromStudio, uiHandler } from "./serveUi.js";
import { RPC_ERRORS, type Notifications, type ProjectOpened } from "@specgate-studio/protocol";

export interface HostOptions {
  projectDir: string;
  reader: SectionReader;
  runner: ProcessRunner;
  /** 0 picks a free port. */
  port: number;
  /** The specgate whose version is checked before anything is read (REQ-013). */
  specgate?: Pick<SpecgatePort, "version">;
  /** The specgate version the studio needs. */
  needs?: string;
  /** The UI's built files, served on the same port as the WebSocket. */
  ui?: string;
  /** The project's files for Explorer and the editor's tabs. */
  files?: ProjectFiles;
}

/** The project's files, by paths relative to it with `/`. */
export interface ProjectFiles {
  list(): Promise<string[]>;
  read(path: string): Promise<string>;
}

/** A path inside the project: relative, `/`-separated, never climbing out of it. */
function insideProject(p: unknown): p is string {
  return (
    typeof p === "string" &&
    p.length > 0 &&
    !p.startsWith("/") &&
    !/^[a-zA-Z]:/.test(p) &&
    !p.includes("\\") &&
    !p.split("/").includes("..")
  );
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
  // The installed specgate first: an older one reads nothing (REQ-013).
  const checked =
    options.specgate && options.needs
      ? await checkSpecgate(options.specgate, options.needs)
      : ({ ok: true } as const);
  const opening = checked.ok ? state.open() : Promise.resolve();
  opening.catch(() => undefined);

  // One address for the browser: the UI's files over HTTP and JSON-RPC over
  // the WebSocket upgrade of the same port.
  const serveFile = uiHandler(options.ui);
  const boundPort = () => {
    const a = http.address();
    return typeof a === "object" && a ? a.port : options.port;
  };
  const http = createServer((req, res) =>
    fromStudio(req, boundPort) ? serveFile(req, res) : res.writeHead(403).end(),
  );
  const server = new WebSocketServer({
    server: http,
    verifyClient: (info, done) => (fromStudio(info.req, boundPort) ? done(true) : done(false, 403)),
  });
  await new Promise<void>((ok, ko) =>
    http.once("listening", ok).once("error", ko).listen(options.port, "127.0.0.1"),
  );

  const broadcast = <N extends keyof Notifications>(method: N, params: Notifications[N]) => {
    const text = JSON.stringify({ jsonrpc: "2.0", method, params });
    for (const ws of server.clients) if (ws.readyState === ws.OPEN) ws.send(text);
  };
  commands.onEvent((event) => broadcast("command.event", event));
  state.onChange((sections) => broadcast("state.changed", { sections }));

  const handlers: Record<string, (params: unknown) => Promise<unknown>> = {
    "project.open": async () => {
      if (!checked.ok)
        throw rpcError(RPC_ERRORS.specgate, `${checked.message}. Fix: ${checked.fix}`);
      await opening;
      const sections: ProjectOpened["sections"] = {};
      for (const s of SECTIONS) sections[s] = await state.section(s);
      return { project: path.basename(options.projectDir), sections } satisfies ProjectOpened;
    },
    "section.get": async (params) => {
      if (!checked.ok)
        throw rpcError(RPC_ERRORS.specgate, `${checked.message}. Fix: ${checked.fix}`);
      const section = (params as { section?: unknown } | null)?.section;
      if (!SECTIONS.includes(section as Section))
        throw rpcError(RPC_ERRORS.params, "unknown section");
      return state.section(section as Section);
    },
    "command.run": async (params) => commands.run(params as SpecgateCommand),
    "files.list": async () => (options.files ? options.files.list() : []),
    "file.read": async (params) => {
      const p = (params as { path?: unknown } | null)?.path;
      if (!insideProject(p) || !options.files)
        throw rpcError(RPC_ERRORS.params, "not a file of the project");
      return { path: p, text: await options.files.read(p) };
    },
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

  const address = http.address();
  const port = typeof address === "object" && address ? address.port : options.port;
  return {
    url: `ws://127.0.0.1:${port}/`,
    state,
    close: () =>
      new Promise<void>((ok) => {
        for (const ws of server.clients) ws.terminate();
        server.close(() => http.close(() => ok()));
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
