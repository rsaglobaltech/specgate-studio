import { RecentProjects, Workspace, type SectionReader } from "@specgate-studio/core";
import {
  NodeFileSystem,
  NodeGit,
  NodeStore,
  NodeWatcher,
  caseInsensitivePaths,
  systemClock,
} from "@specgate-studio/adapter-node";
import { SpecgateCli, specgateBin } from "@specgate-studio/adapter-specgate-cli";
import { HostRegistry } from "./HostRegistry.js";
import { NodeProcessRunner } from "./NodeProcessRunner.js";
import { startHost, type Host } from "./startHost.js";

export interface ProjectHostOptions {
  /** 0 picks a free port. */
  port?: number;
  /** The hosts of every open project; one is made when none is given. */
  registry?: HostRegistry;
  /** The studio's settings folder; the user's (draft-workspace A6) when not given. */
  home?: string;
  /** How a specgate project's sections are read; the CLI adapter when not given. */
  reader?: (projectDir: string) => SectionReader;
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
  const reader =
    kind !== "specgate"
      ? NOT_A_PROJECT
      : options.reader
        ? options.reader(projectDir)
        : new SpecgateCli({ program: process.execPath, prefix: [specgateBin()], projectDir });

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
  });
  await recent.opened(projectDir);
  registry.add(projectDir, host);
  return host;
}
