import { watch as fsWatch, promises as fsp, type FSWatcher } from "node:fs";
import * as path from "node:path";
import { ANY_FILE, GIT_STATE, type Watch, type WatcherPort } from "@specgate-studio/core";
import { posix } from "./paths.js";

/**
 * WatcherPort over Node's `fs.watch` (REQ-022, REQ-023).
 *
 * On macOS and Windows one recursive watch covers the project (FSEvents,
 * ReadDirectoryChangesW) and ignored paths are dropped as they are told. On
 * Linux a recursive watch would add an inotify watch for every folder of
 * `node_modules`; there each folder outside the ignored ones gets its own
 * watch instead, and a folder created later is watched as it appears.
 */
export class NodeWatcher implements WatcherPort {
  constructor(private readonly platform: NodeJS.Platform = process.platform) {}

  async watch(
    root: string,
    ignored: (path: string) => boolean,
    onChange: (path: string) => void,
  ): Promise<Watch> {
    const tell = (rel: string) => {
      const p = posix(rel);
      if (p && !ignored(p)) onChange(p);
    };
    // git's own state — a commit, a stage, a checkout — is told apart (draft-explorer-tree REQ-163).
    const git = watchGit(root, () => onChange(GIT_STATE));
    if (this.platform !== "linux") {
      // No name: the system's buffer overflowed and the names are lost (Windows).
      const w = fsWatch(root, { recursive: true }, (_event, name) => {
        if (name) tell(name.toString());
        else onChange(ANY_FILE);
      });
      // A watch that fails — its folder deleted — is closed, never left to spin.
      w.on("error", () => w.close());
      return { close: async () => (w.close(), git?.close()) };
    }
    const files = await perFolder(root, ignored, tell, () => onChange(ANY_FILE));
    return { close: async () => (git?.close(), files.close()) };
  }
}

async function perFolder(
  root: string,
  ignored: (path: string) => boolean,
  tell: (rel: string) => void,
  lost: () => void,
): Promise<Watch> {
  const watchers = new Map<string, FSWatcher>();
  let closed = false;

  const add = async (rel: string): Promise<void> => {
    if (closed || watchers.has(rel) || (rel && ignored(rel))) return;
    const abs = rel ? path.join(root, rel) : root;
    let w: FSWatcher;
    try {
      w = fsWatch(abs, (_event, name) => {
        if (!name) return lost();
        const child = rel ? `${rel}/${name.toString()}` : name.toString();
        tell(child);
        // A new folder is watched as it appears; a gone one stops by itself.
        fsp
          .stat(path.join(root, child))
          .then((s) => (s.isDirectory() ? add(child) : undefined))
          .catch(() => undefined);
      });
    } catch {
      return;
    }
    w.on("error", () => {
      w.close();
      watchers.delete(rel);
    });
    watchers.set(rel, w);
    let entries: import("node:fs").Dirent[] = [];
    try {
      entries = await fsp.readdir(abs, { withFileTypes: true });
    } catch {
      return;
    }
    await Promise.all(
      entries.filter((e) => e.isDirectory()).map((e) => add(rel ? `${rel}/${e.name}` : e.name)),
    );
  };

  await add("");
  return {
    close: async () => {
      closed = true;
      for (const w of watchers.values()) w.close();
      watchers.clear();
    },
  };
}

/** `.git/index` and `.git/HEAD` watched, not the rest of `.git`: a commit or a stage changes them. */
function watchGit(root: string, changed: () => void): FSWatcher | null {
  try {
    const w = fsWatch(path.join(root, ".git"), (_event, name) => {
      const n = name?.toString();
      if (n === "index" || n === "HEAD") changed();
    });
    w.on("error", () => w.close());
    return w;
  } catch {
    // Not a repository, or `.git` is a file (a worktree): nothing to watch.
    return null;
  }
}
