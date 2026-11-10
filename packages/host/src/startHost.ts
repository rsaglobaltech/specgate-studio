import { createServer } from "node:http";
import * as path from "node:path";
import { WebSocketServer, type WebSocket } from "ws";
import {
  annotate,
  questionOptions,
  type Finding,
  type OpenQuestion,
  ACTIONS,
  LANGS,
  PART_LABELS,
  explain,
  type ActionId,
  type HelpVars,
  type Lang,
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
  /** The specification's findings with file and line (`validate --strict`), for the editor (REQ-043). */
  findings?: () => Promise<Finding[]>;
}

/** The project's files, by paths relative to it with `/`. */
export interface ProjectFiles {
  list(): Promise<string[]>;
  read(path: string): Promise<string>;
  /** Only when the person saves (draft-editor REQ-045). */
  write?(path: string, text: string): Promise<void>;
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
  // The requirement Home says to apply next, for the notices (REQ-063).
  let nextReq: string | undefined;
  const commands = new Commands(options.runner, {
    helpVars: () => (nextReq ? { req: nextReq } : {}),
  });
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
  const readNext = () =>
    state
      .section("home")
      .then((home) => {
        const next = (home as { nextCommand?: unknown } | null)?.nextCommand;
        nextReq = typeof next === "string" ? /\bREQ-\d+\b/.exec(next)?.[0] : undefined;
      })
      .catch(() => undefined);
  // An outdated specgate reads nothing, not even for the notices (REQ-013).
  if (checked.ok) void opening.then(readNext);
  state.onChange((sections) => {
    if (checked.ok && sections.includes("home")) void readNext();
    broadcast("state.changed", { sections });
  });

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
    "command.run": async (params) => {
      const result = await commands.run(params as SpecgateCommand);
      // What it wrote feeds sections: read them again now, not when the watcher says.
      if (result.ok)
        for (const f of result.written) await state.fileChanged(f).catch(() => undefined);
      return result;
    },
    // The "?": data shipped with the studio; nothing runs, specgate is not asked (A2).
    "help.explain": async (params) => {
      const p = (params ?? {}) as { action?: unknown; lang?: unknown; vars?: unknown };
      if (!ACTIONS.includes(p.action as ActionId) || !LANGS.includes(p.lang as Lang))
        throw rpcError(RPC_ERRORS.params, "no such action or language");
      const lang = p.lang as Lang;
      const vars = Object.fromEntries(
        Object.entries((p.vars ?? {}) as Record<string, unknown>).filter(
          ([k, v]) => ["req", "change", "module", "key", "q"].includes(k) && typeof v === "string",
        ),
      ) as HelpVars;
      return { labels: PART_LABELS[lang], explanation: explain(p.action as ActionId, lang, vars) };
    },
    "files.list": async () => (options.files ? options.files.list() : []),
    // Saving: that one file, only when the person saves (REQ-045).
    "file.write": async (params) => {
      const p = (params ?? {}) as { path?: unknown; text?: unknown };
      if (!insideProject(p.path) || typeof p.text !== "string" || !options.files?.write)
        throw rpcError(RPC_ERRORS.params, "not a file of the project, or no text");
      await options.files.write(p.path, p.text);
      return { path: p.path };
    },
    // What the editor shows over a file: findings and blocking questions (REQ-043, REQ-044).
    "file.annotations": async (params) => {
      const { path, text: unsaved } = (params ?? {}) as { path?: unknown; text?: unknown };
      if (!insideProject(path) || !options.files)
        throw rpcError(RPC_ERRORS.params, "not a file of the project");
      const files = options.files;
      const [text, findings, questionsData] = await Promise.all([
        // The editor's unsaved text when it sends it: the actions follow the edit.
        typeof unsaved === "string" ? unsaved : files.read(path),
        options.findings ? options.findings().catch(() => []) : Promise.resolve([]),
        checked.ok ? state.section("questions").catch(() => null) : Promise.resolve(null),
      ]);
      const open =
        (questionsData as { questions?: { open?: Array<Omit<OpenQuestion, "options">> } } | null)
          ?.questions?.open ?? [];
      const questions: OpenQuestion[] = await Promise.all(
        open.map(async (q) => {
          const md =
            q.change === "project"
              ? "docs/specs/questions.md"
              : `docs/specs/changes/${q.change}/questions.md`;
          const table = insideProject(md) ? await files.read(md).catch(() => "") : "";
          return { ...q, options: questionOptions(table, q.id) };
        }),
      );
      return annotate({ path, text, findings, questions });
    },
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
