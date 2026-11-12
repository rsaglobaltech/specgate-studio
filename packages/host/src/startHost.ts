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
  fromWire,
  ProjectState,
  type SpecgatePort,
  SECTIONS,
  unreadableOf,
  type ProcessRunner,
  type Section,
  type SectionReader,
  type SpecgateCommand,
  type StorePort,
  type SpecgateAnswer,
  type CommandEvent,
  type UserSettingsPort,
} from "@specgate-studio/core";
import { attachSettings } from "./settings.js";
import { fromStudio, uiHandler } from "./serveUi.js";
import { attachTerminals, type TerminalWiring } from "./terminals.js";
import { RPC_ERRORS, type Notifications, type ProjectOpened } from "@specgate-studio/protocol";
import { attachWorkspace, type WorkspaceWiring } from "./workspace.js";
import { attachChanges, type ChangesWiring } from "./changes.js";
import { attachSetup, type SetupWiring } from "./setup.js";
import { attachBuilds, type BuildsWiring } from "./builds.js";
import { attachBrief, type BriefWiring } from "./brief.js";
import { attachAgent, type AgentWiring } from "./agent.js";
import { attachExplorer } from "./explorer.js";
import { attachHome } from "./home.js";
import { attachFolders, type FoldersWiring } from "./folders.js";
import type { ProjectFiles } from "./files.js";

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
  /** The open folder: its kind, git state, watch and recent projects (draft-workspace). */
  workspace?: WorkspaceWiring;
  /** The UI's built files, served on the same port as the WebSocket. */
  ui?: string;
  /** The Developer's terminals: the pty and their shell (draft-terminal). */
  terminals?: TerminalWiring;
  /** The project's files for Explorer and the editor's tabs. */
  files?: ProjectFiles;
  /** The specification's findings with file and line (`validate --strict`), for the editor (REQ-043). */
  findings?: () => Promise<Finding[]>;
  /** specgate's `--json` answers for the Changes view and its commands (draft-changes). */
  changes?: ChangesWiring;
  /** Creating or adopting a folder that is no project yet (draft-project-setup). */
  setup?: SetupWiring;
  /** Build and Live: what is ready, the build, its events (draft-build-live). */
  builds?: BuildsWiring;
  /** specgate's `--json` answers for the Brief view: its checks and drafts (draft-brief). */
  brief?: BriefWiring;
  /** Where the Explorer keeps the folders left open per project (draft-explorer-tree A4). */
  store?: StorePort;
  /** Open Folder and Clone Repository; `none` when no folder is open (draft-workbench-v2 REQ-185). */
  folders?: FoldersWiring;
  /** specgate's `agent ask|apply|discard --json` for the agent panel (draft-workbench-v2 REQ-181 … REQ-183). */
  agent?: AgentWiring;
  /** The Developer's own settings file, the User scope of Settings (draft-settings REQ-141). */
  userSettings?: UserSettingsPort;
}

export type { ProjectFiles, FileRefusal } from "./files.js";
export { FILE_REFUSALS } from "./files.js";

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
export async function startHost(given: HostOptions): Promise<Host> {
  // specgate's read-only answers, shared by Changes, Build and Home until
  // anything changes: each is asked once (draft-design-conformance REQ-173).
  const reads = new Map<string, Promise<SpecgateAnswer>>();
  const forget = () => reads.clear();
  const READ_ONLY = /^(change show \S+|harness report|config list)$/;
  const memo = <P extends Pick<SpecgatePort, "call">>(port: P): P => {
    const wrapped = Object.create(port) as P;
    wrapped.call = (args: readonly string[]) => {
      const key = args.join(" ");
      if (!READ_ONLY.test(key)) {
        forget();
        return port.call(args);
      }
      let answer = reads.get(key);
      if (!answer) {
        answer = port.call(args);
        reads.set(key, answer);
        answer.catch(() => reads.get(key) === answer && reads.delete(key));
      }
      return answer.then((a) => structuredClone(a));
    };
    return wrapped;
  };
  const options: HostOptions = {
    ...given,
    ...(given.changes
      ? { changes: { ...given.changes, specgate: memo(given.changes.specgate) } }
      : {}),
    ...(given.builds ? { builds: { ...given.builds, specgate: memo(given.builds.specgate) } } : {}),
  };
  const state = new ProjectState(options.reader);
  state.onChange(forget);
  // The requirement Home says to apply next, for the notices (REQ-063).
  let nextReq: string | undefined;
  const changes = options.changes
    ? attachChanges(
        options.projectDir,
        options.changes,
        state,
        options.workspace?.git,
        (m) => rpcError(RPC_ERRORS.params, m),
        (): Pick<Commands, "run"> => commands,
      )
    : null;
  const commands: Commands = new Commands(options.runner, {
    helpVars: () => (nextReq ? { req: nextReq } : {}),
    ...(options.brief ? { json: options.brief.specgate } : {}),
    ...changes?.commands,
  });
  // The installed specgate first: an older one reads nothing (REQ-013).
  const checked =
    options.specgate && options.needs
      ? await checkSpecgate(options.specgate, options.needs)
      : ({ ok: true } as const);
  let opening = checked.ok ? state.open() : Promise.resolve();
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
    // What specgate answered may have changed with it.
    if (method !== "terminal.data" && method !== "command.event") forget();
    if (method === "command.event" && (params as CommandEvent).type === "ended") forget();
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
  // A first read that fails (a folder that is no project) leaves Next unread.
  if (checked.ok) void opening.then(readNext, () => undefined);
  // Live shows the agent's questions: an answer read again is told there too (REQ-104).
  let liveRefresh: (() => void) | null = null;
  state.onChange((sections) => {
    if (checked.ok && sections.includes("home")) void readNext();
    broadcast("state.changed", { sections });
    if (sections.includes("questions")) liveRefresh?.();
  });
  const workspace = options.workspace
    ? await attachWorkspace(options.projectDir, options.workspace, state, broadcast)
    : null;
  const terminals = options.terminals
    ? attachTerminals(
        options.projectDir,
        options.terminals,
        broadcast,
        (m) => rpcError(RPC_ERRORS.params, m),
        // A terminal opens only in a folder of the project (draft-explorer-tree A15).
        async (dir) =>
          options.files?.children
            ? options.files.children(dir).then(
                () => true,
                () => false,
              )
            : false,
      )
    : null;

  const brief = options.brief
    ? attachBrief(options.brief, commands, broadcast, (p) => state.fileChanged(p))
    : null;
  // The agent panel: plans specgate makes and writes, never the studio (REQ-181 … REQ-183).
  const agent = options.agent
    ? attachAgent(
        options.projectDir,
        options.agent,
        commands,
        state,
        broadcast,
        async () => (options.files ? options.files.list() : []),
        options.store,
      )
    : null;

  // Home's next step, route, cost and activity (draft-design-conformance REQ-173).
  const homeSpecgate =
    options.builds?.specgate ?? options.changes?.specgate ?? options.brief?.specgate;
  const home = attachHome(options.projectDir, {
    state,
    ...(options.files ? { files: options.files } : {}),
    ...(homeSpecgate ? { specgate: homeSpecgate } : {}),
    ...(options.workspace?.git ? { git: options.workspace.git } : {}),
  });

  // The Explorer's tree and its writes (draft-explorer-tree).
  const explorer = options.files
    ? attachExplorer(
        options.projectDir,
        {
          files: options.files,
          ...(options.workspace?.git ? { git: options.workspace.git } : {}),
          ...(options.store ? { store: options.store } : {}),
        },
        broadcast,
        (m) => rpcError(RPC_ERRORS.params, m),
      )
    : null;

  // Settings: the project's read through specgate, the user's in their own file (REQ-141).
  const settings = attachSettings({
    ...(homeSpecgate ? { specgate: homeSpecgate } : {}),
    ...(options.userSettings ? { user: options.userSettings } : {}),
  });

  const setup = options.setup
    ? attachSetup(
        options.projectDir,
        options.setup,
        commands,
        async () => (options.files ? options.files.list() : []),
        (m) => rpcError(RPC_ERRORS.params, m),
      )
    : null;

  const builds = options.builds
    ? attachBuilds(
        options.projectDir,
        options.builds,
        state,
        commands,
        (m) => rpcError(RPC_ERRORS.params, m),
        (view) => broadcast("live.changed", view),
      )
    : null;
  liveRefresh = builds ? () => builds.refresh() : null;

  const handlers: Record<string, (params: unknown) => Promise<unknown>> = {
    "project.open": async () => {
      if (!checked.ok)
        throw rpcError(RPC_ERRORS.specgate, `${checked.message}. Fix: ${checked.fix}`);
      // A folder created or adopted since the host started is read now (draft-project-setup).
      await opening.catch(() => {
        opening = state.open();
        return opening.then(readNext);
      });
      // A section that cannot be read is said apart; the others still open (REQ-178).
      const sections: ProjectOpened["sections"] = {};
      const unreadable: NonNullable<ProjectOpened["unreadable"]> = {};
      for (const s of SECTIONS) {
        try {
          sections[s] = await state.section(s);
        } catch (e) {
          unreadable[s] = unreadableOf(e);
        }
      }
      // Nothing read at all: not a project yet, or specgate cannot answer.
      if (Object.keys(sections).length === 0)
        throw new Error(unreadable.home?.message ?? "nothing could be read");
      return {
        project: path.basename(options.projectDir),
        sections,
        ...(Object.keys(unreadable).length ? { unreadable } : {}),
      } satisfies ProjectOpened;
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
      // A module's draft runs the project's agent: the host's, never one the wire names (draft-brief A6).
      if (!fromWire(params as SpecgateCommand))
        return {
          ok: false,
          code: "command_unknown",
          message: 'A module is drafted with "Draft the modules", with the project\'s agent.',
        };
      const result = await commands.run(params as SpecgateCommand);
      // What it wrote feeds sections: read them again now, not when the watcher says.
      if (result.ok)
        for (const f of result.written) await state.fileChanged(f).catch(() => undefined);
      // "The spec says it" lifts Needs Clarification where each requirement is
      // defined, a file the studio does not know: every section is read again.
      if (
        result.ok &&
        result.exitCode === 0 &&
        (params as SpecgateCommand).name === "answer-reviewed"
      )
        await state.fileChanged("*").catch(() => undefined);
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
          ([k, v]) =>
            [
              "req",
              "change",
              "module",
              "key",
              "q",
              "agent",
              "path",
              "to",
              "repo",
              "side",
              "id",
              "then",
              "count",
            ].includes(k) && typeof v === "string",
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
      // The brief's checks on every save, in Problems (draft-brief REQ-072).
      brief?.saved(p.path);
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
        (options.findings ? options.findings().catch(() => []) : Promise.resolve([])).then(
          // The brief's own findings are underlined too (draft-brief A3).
          (found) => [...found, ...(brief?.findings() ?? [])],
        ),
        checked.ok ? state.section("questions").catch(() => null) : Promise.resolve(null),
      ]);
      const open =
        (
          questionsData as {
            questions?: { open?: Array<Omit<OpenQuestion, "options"> & { options?: string[] }> };
          } | null
        )?.questions?.open ?? [];
      const questions: OpenQuestion[] = await Promise.all(
        open.map(async (q) => {
          // specgate 0.33.1 says the options (REQ-479); an older one is read from its table.
          if (Array.isArray(q.options)) return { ...q, options: q.options };
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
    // The Help view: every action's "?", in one language (draft-design-conformance REQ-179).
    "help.catalog": async (params) => {
      const lang = (params as { lang?: unknown } | null)?.lang;
      if (!LANGS.includes(lang as Lang)) throw rpcError(RPC_ERRORS.params, "no such language");
      return {
        labels: PART_LABELS[lang as Lang],
        actions: ACTIONS.map((action) => ({ action, explanation: explain(action, lang as Lang) })),
      };
    },
    "file.read": async (params) => {
      const p = (params as { path?: unknown } | null)?.path;
      if (!insideProject(p) || !options.files)
        throw rpcError(RPC_ERRORS.params, "not a file of the project");
      return { path: p, text: await options.files.read(p) };
    },
    ...workspace?.handlers,
    ...terminals?.handlers,
    ...changes?.handlers,
    ...setup?.handlers,
    ...builds?.handlers,
    ...brief?.handlers,
    ...agent?.handlers,
    ...explorer?.handlers,
    ...home.handlers,
    ...settings.handlers,
    ...(options.folders
      ? attachFolders(options.folders, broadcast, (m) => rpcError(RPC_ERRORS.params, m)).handlers
      : {}),
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
    close: async () => {
      await builds?.close();
      await terminals?.close();
      await workspace?.close();
      await new Promise<void>((ok) => {
        for (const ws of server.clients) ws.terminate();
        // A page left open keeps its HTTP connections: dropped, so closing never waits on it.
        server.close(() => {
          http.close(() => ok());
          http.closeAllConnections();
        });
      });
    },
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
