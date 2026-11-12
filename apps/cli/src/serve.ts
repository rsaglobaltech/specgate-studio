import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  shellFor,
  type Finding,
  type ProcessRunner,
  type SectionReader,
  type ScratchPort,
  type SpecgatePort,
  type UserSettingsPort,
} from "@specgate-studio/core";
import {
  HostRegistry,
  NodeProcessRunner,
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
      (dir) => serve({ ...options, noFolder: false, projectDir: dir, port: 0 }),
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
    });
  }
  return startProjectHost(projectDir, {
    port,
    ui,
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
