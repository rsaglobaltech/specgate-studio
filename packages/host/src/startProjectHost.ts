import {
  RecentProjects,
  SPECGATE_MARKER,
  Workspace,
  toPosix,
  type Finding,
  type SectionReader,
  type SpecgatePort,
} from "@specgate-studio/core";
import {
  NodeFileSystem,
  NodeGit,
  NodeHarnessEvents,
  NodeStore,
  NodeWatcher,
  caseInsensitivePaths,
  systemClock,
} from "@specgate-studio/adapter-node";
import { SpecgateCli, SpecgateSetup, specgateBin } from "@specgate-studio/adapter-specgate-cli";
import { HostRegistry } from "./HostRegistry.js";
import { NodeProcessRunner } from "./NodeProcessRunner.js";
import { NodeBuildRunner } from "./NodeBuildRunner.js";
import { startHost, type Host, type ProjectFiles } from "./startHost.js";
import type { TerminalWiring } from "./terminals.js";

export interface ProjectHostOptions {
  /** 0 picks a free port. */
  port?: number;
  /** The hosts of every open project; one is made when none is given. */
  registry?: HostRegistry;
  /** The studio's settings folder; the user's (draft-workspace A6) when not given. */
  home?: string;
  /** How a specgate project's sections are read; the CLI adapter when not given. */
  reader?: (projectDir: string) => SectionReader | Promise<SectionReader>;
  /** The UI's built files, served by every project's host (draft-workbench). */
  ui?: string;
  /** The project's files for Explorer and the editor (draft-workbench, draft-editor). */
  files?: (projectDir: string) => ProjectFiles;
  /** The specification's findings with file and line, for the editor (draft-editor REQ-043). */
  findings?: (projectDir: string) => () => Promise<Finding[]>;
  /** The Developer's terminals (draft-terminal). */
  terminals?: TerminalWiring;
  /** Whether a program is on the PATH: the agent an adoption saves (draft-project-setup A8). */
  onPath?: (program: string) => boolean;
}

/** A folder that is not a specgate project reads nothing, and no specgate runs for it (REQ-021). */
const NOT_A_PROJECT: SectionReader = {
  read: async () => {
    throw new Error("not a specgate project: no section to read");
  },
};

/**
 * A project's core host with the Node adapters wired in (ADR-0001 rule 5):
 * the folder's kind decides whether specgate is read at all (REQ-021), its
 * changes are watched (REQ-022, REQ-023), and it joins the recent projects
 * (REQ-026) and the registry of open projects, which `recent.open` uses to
 * open another one in a host of its own.
 */
export async function startProjectHost(
  projectDir: string,
  options: ProjectHostOptions = {},
): Promise<Host> {
  const fs = new NodeFileSystem();
  const git = new NodeGit();
  const caseInsensitive = caseInsensitivePaths();
  const recent = new RecentProjects(new NodeStore(options.home), systemClock, caseInsensitive);
  const registry: HostRegistry =
    options.registry ??
    new HostRegistry(
      (dir): Promise<Host> => startProjectHost(dir, { ...options, registry, port: 0 }),
      caseInsensitive,
    );

  const kind = (await (await Workspace.open(projectDir, fs, git)).state()).kind;
  const cli = new SpecgateCli({ program: process.execPath, prefix: [specgateBin()], projectDir });
  const make = async () => (options.reader ? await options.reader(projectDir) : cli);
  let project: Promise<SectionReader> | null = kind === "specgate" ? make() : null;
  // A folder created or adopted in the studio is read from then on (draft-project-setup).
  const reader: SectionReader = {
    read: async (section) => {
      if (!project) {
        if (!(await fs.exists(`${toPosix(projectDir)}/${SPECGATE_MARKER}`)))
          return NOT_A_PROJECT.read(section);
        project = make();
      }
      return (await project).read(section);
    },
  };
  if (project) await project;

  const host = await startHost({
    projectDir,
    reader,
    runner: new NodeProcessRunner({
      program: process.execPath,
      prefix: [specgateBin()],
      projectDir,
    }),
    port: options.port ?? 0,
    workspace: { fs, git, watcher: new NodeWatcher(), recent, registry },
    ...(options.ui ? { ui: options.ui } : {}),
    ...(options.files ? { files: options.files(projectDir) } : {}),
    ...(options.findings ? { findings: options.findings(projectDir) } : {}),
    ...(options.terminals ? { terminals: options.terminals } : {}),
    // The Changes view reads specgate's `--json` (draft-changes): through the
    // project's reader when it answers `--json`, the CLI otherwise.
    changes: {
      specgate: {
        call: async (args) => {
          const r = project ? await project : cli;
          return hasCall(r) ? r.call(args) : cli.call(args);
        },
      },
    },
    // Build and Live read specgate's `--json` through the CLI (draft-build-live).
    builds: {
      specgate: cli,
      git,
      harness: new NodeBuildRunner({
        program: process.execPath,
        prefix: [specgateBin()],
        projectDir,
      }),
      events: new NodeHarnessEvents(),
    },
    setup: { port: new SpecgateSetup(cli), fs, onPath: options.onPath ?? (() => false) },
    // The brief's checks and drafts, with --json through the CLI (draft-brief).
    brief: { specgate: cli },
  });
  await recent.opened(projectDir);
  registry.add(projectDir, host);
  return host;
}

function hasCall(r: SectionReader): r is SectionReader & Pick<SpecgatePort, "call"> {
  return typeof (r as Partial<SpecgatePort>).call === "function";
}
