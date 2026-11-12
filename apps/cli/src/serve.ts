import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  shellFor,
  type Finding,
  type HostLock,
  type ProcessRunner,
  type SectionReader,
  type ScratchPort,
  type SpecgatePort,
  type UserSettingsPort,
} from "@specgate-studio/core";
import {
  HostRegistry,
  HostLocks,
  NodeProcessRunner,
  joinToken,
  newToken,
  startHost,
  startProjectHost,
  type Host,
  type ProjectFiles,
  type TerminalWiring,
  type WorkspaceWiring,
  type BuildsWiring,
  type FoldersWiring,
} from "@specgate-studio/host";
import { NodePty, hasProgram } from "@specgate-studio/adapter-pty-node";
import { SpecgateCli, specgateBin } from "@specgate-studio/adapter-specgate-cli";
import { inProcessSpecgate } from "@specgate-studio/adapter-specgate-api";
import {
  NodeFolders,
  NodeGit,
  NodeScratch,
  NodePrograms,
  NodeUserSettings,
  caseInsensitivePaths,
} from "@specgate-studio/adapter-node";
import { nodeFiles } from "./nodeFiles.js";

/** The UI bundle built by apps/ui. */
export const UI_DIST = fileURLToPath(new URL("../../../ui/dist", import.meta.url));

export interface ServeOptions {
  /** The folder to open; with `noFolder`, none is (draft-workbench-v2 REQ-185). */
  projectDir: string;
  /** Started with no folder open: the Explorer offers Open Folder and Clone Repository. */
  noFolder?: boolean;
  /** Open Folder and Clone Repository's fakes, for tests. */
  folders?: FoldersWiring;
  /** 4180 by default (draft-core-host A2); 0 picks a free one. */
  port?: number;
  ui?: string;
  /** Fakes for tests; given any of them, the host runs on fakes alone. */
  reader?: SectionReader;
  runner?: ProcessRunner;
  files?: ProjectFiles;
  findings?: () => Promise<Finding[]>;
  workspace?: WorkspaceWiring;
  /** specgate's `--json` answers for the Changes and Brief views (draft-changes, draft-brief). */
  specgate?: Pick<SpecgatePort, "call">;
  /** The Developer's terminals; the real pty and their shell when not given. */
  terminals?: TerminalWiring;
  /** The studio's settings folder; the user's when not given (draft-workspace A6). */
  home?: string;
  /** Build and Live's fakes over `specgate` (draft-build-live). */
  builds?: Omit<BuildsWiring, "specgate">;
  /** Files outside the project for the brief's form; the system's temporary folder when not given. */
  scratch?: ScratchPort;
  /**
   * The session tokens the host answers to (draft-desktop REQ-151, A2): none
   * asks for none. A project opened from it gets a token of its own.
   */
  tokens?: readonly string[];
  /** The Developer's own settings file, Settings' User scope (draft-settings REQ-141). */
  userSettings?: UserSettingsPort;
}

/**
 * `specgate-studio serve`: the project's core host, serving the UI and its
 * JSON-RPC on 127.0.0.1 — the only place adapters are wired (ADR-0001 rule
 * 5): the open folder through the Node adapters (draft-workspace), specgate
 * in process where its API answers and through the CLI otherwise.
 */
export async function serve(options: ServeOptions): Promise<Host> {
  const projectDir = path.resolve(options.projectDir);
  const ui = options.ui ?? UI_DIST;
  const port = options.port ?? 4180;
  // The Developer's shell in a real pty (draft-terminal A1, A10).
  const terminals = options.terminals ?? {
    pty: new NodePty(),
    shell: shellFor(process.platform, process.env, hasProgram),
    home: os.homedir(),
  };
  // No folder open (REQ-185): a host with nothing to read, terminals in the
  // Developer's home, and Open Folder and Clone opening a project's own host.
  if (options.noFolder) {
    const registry = new HostRegistry(
      (dir) =>
        serve({
          ...options,
          noFolder: false,
          projectDir: dir,
          port: 0,
          ...(options.tokens?.length ? { tokens: [newToken()] } : {}),
        }),
      caseInsensitivePaths(),
    );
    const folders: FoldersWiring = options.folders ?? {
      folders: new NodeFolders(),
      programs: new NodePrograms(),
      open: async (dir) => ({ url: (await registry.open(dir)).url }),
      none: true,
    };
    const home = folders.folders.home();
    const host = await startHost({
      projectDir: home,
      reader: {
        read: async () => {
          throw new Error("No folder is open.");
        },
      },
      runner: { run: async () => 127 },
      // With no folder open the user's settings are still theirs to change (draft-settings REQ-141).
      userSettings: options.userSettings ?? new NodeUserSettings(options.home),
      terminals: { ...terminals, home },
      port,
      ui,
      folders: { ...folders, none: true },
      ...(options.tokens ? { tokens: options.tokens } : {}),
    });
    const close = host.close.bind(host);
    host.close = async () => {
      await registry.closeAll();
      await close();
    };
    return host;
  }
  const cliFor = (dir: string) =>
    new SpecgateCli({ program: process.execPath, prefix: [specgateBin()], projectDir: dir });
  if (options.reader || options.runner || options.files || options.workspace) {
    return startHost({
      projectDir,
      reader: options.reader ?? cliFor(projectDir),
      runner:
        options.runner ??
        new NodeProcessRunner({ program: process.execPath, prefix: [specgateBin()], projectDir }),
      files: options.files ?? nodeFiles(projectDir, { git: new NodeGit() }),
      ...(options.findings ? { findings: options.findings } : {}),
      ...(options.workspace ? { workspace: options.workspace } : {}),
      ...(options.specgate
        ? {
            changes: { specgate: options.specgate },
            brief: { specgate: options.specgate, scratch: options.scratch ?? new NodeScratch() },
            agent: { specgate: options.specgate },
          }
        : {}),
      ...(options.specgate ? { builds: { ...options.builds, specgate: options.specgate } } : {}),
      ...(options.userSettings ? { userSettings: options.userSettings } : {}),
      terminals,
      port,
      ui,
      ...(options.tokens ? { tokens: options.tokens } : {}),
    });
  }
  return startProjectHost(projectDir, {
    port,
    ui,
    ...(options.tokens ? { tokens: options.tokens } : {}),
    terminals,
    ...(options.home ? { home: options.home } : {}),
    reader: async (dir) => (await inProcessSpecgate(cliFor(dir), dir)) ?? cliFor(dir),
    // The agent an adoption saves is the one on the PATH (draft-project-setup A8).
    onPath: hasProgram,
    files: (dir) => nodeFiles(dir, { git: new NodeGit() }),
    // The specification's findings with file and line, for the editor (REQ-043): read-only.
    findings: (dir) => async () => (await cliFor(dir).call(["validate", "--strict"])).findings,
  });
}

/** A host this process started for the project, its lock written. */
export interface Served {
  joined: false;
  /** `http://127.0.0.1:<port>/?token=<token>`: the UI and its JSON-RPC, with the window's or tab's token. */
  url: string;
  /** The token given to this window or tab (draft-desktop A2). */
  token: string;
  key: string;
  /** Closing it removes its lock. */
  host: Host;
}

/** The host another process runs for the project: a desktop window's, or another `serve`. */
export interface Joined {
  joined: true;
  /** That host's address, with a token of its own it issued for this window or tab. */
  url: string;
  token: string;
  key: string;
  lock: HostLock;
}

/** `http://127.0.0.1:<port>/` with `?token=`. */
export function withToken(url: string, token: string): string {
  const u = new URL(url.replace(/^ws/, "http"));
  u.search = "";
  u.searchParams.set("token", token);
  return u.toString();
}

/**
 * The project's one core host (draft-desktop REQ-158, A11): the one already
 * running for it — found by its lock in the studio's settings folder — or a
 * new one, whose lock this writes so the next window or `serve` finds it. A
 * desktop window and a browser tab on one project share one host; each gets
 * a session token of its own, and nothing without one is answered (A2):
 * `token` is the starter's — the desktop shell's per-launch secret — or a new one.
 */
export async function serveOrJoin(
  options: ServeOptions & { locks?: HostLocks; token?: string },
): Promise<Served | Joined> {
  const locks = options.locks ?? new HostLocks(options.home);
  const running = await locks.find(options.projectDir);
  if (running) {
    const token = await joinToken(running);
    return {
      joined: true,
      url: withToken(running.url, token),
      token,
      key: running.key,
      lock: running,
    };
  }
  const token = options.token || newToken();
  // The lock's own token, never given to a window: what joiners ask with.
  const secret = newToken();
  const host = await serve({ ...options, tokens: [token, secret] });
  const plain = host.url.replace(/^ws/, "http").replace(/\?.*$/, "");
  const claimed = await locks.claim(options.projectDir, plain, secret);
  return {
    joined: false,
    url: withToken(plain, token),
    token,
    key: claimed.lock.key,
    host: {
      ...host,
      close: async () => {
        await claimed.release();
        await host.close();
      },
    },
  };
}
