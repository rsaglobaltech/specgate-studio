import {
  ProjectState,
  RecentProjects,
  Workspace,
  type FileSystemPort,
  type GitPort,
  type WatcherPort,
  type WorkspaceState,
} from "@specgate-studio/core";
import type { Notifications } from "@specgate-studio/protocol";

/** What opens another project in a host of its own: the HostRegistry (REQ-026). */
export interface ProjectOpener {
  open(projectDir: string): Promise<{ url: string; reused: boolean }>;
}

/** The ports and services of the open folder (draft-workspace). */
export interface WorkspaceWiring {
  fs: FileSystemPort;
  git: GitPort;
  /** Without one, nothing is watched (tests of the RPC alone). */
  watcher?: WatcherPort;
  recent?: RecentProjects;
  /** The hosts of every open project, for `recent.open` (REQ-026). */
  registry?: ProjectOpener;
}

type Broadcast = <N extends keyof Notifications>(method: N, params: Notifications[N]) => void;

/**
 * The open folder in the host: `workspace.get`, `recent.list` and
 * `recent.open` (REQ-021 … REQ-026), and its watch — a saved file of the
 * specification reads again the sections it feeds (REQ-003), and every UI is
 * told the folder's new state (REQ-023).
 */
export async function attachWorkspace(
  projectDir: string,
  wiring: WorkspaceWiring,
  state: ProjectState,
  broadcast: Broadcast,
): Promise<{
  handlers: Record<string, (params: unknown) => Promise<unknown>>;
  close(): Promise<void>;
}> {
  const workspace = await Workspace.open(projectDir, wiring.fs, wiring.git);
  let current: Promise<WorkspaceState> = workspace.state();
  current.catch(() => undefined);

  const watch = wiring.watcher
    ? await workspace.watch(
        wiring.watcher,
        (file) => void state.fileChanged(file).catch(() => undefined),
        (next) => {
          current = Promise.resolve(next);
          broadcast("workspace.changed", { state: next });
        },
      )
    : null;

  const handlers: Record<string, (params: unknown) => Promise<unknown>> = {
    "workspace.get": () => current,
    "recent.list": async () => (wiring.recent ? wiring.recent.list() : []),
    "recent.open": async (params) => {
      const path = (params as { path?: unknown } | null)?.path;
      if (typeof path !== "string" || !path) throw new Error("recent.open needs a path");
      if (!wiring.registry) throw new Error("this host opens no other project");
      const { url, reused } = await wiring.registry.open(path);
      return { url, reused };
    },
  };
  return { handlers, close: async () => void (await watch?.close()) };
}
