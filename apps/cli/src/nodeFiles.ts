import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { ProjectFiles } from "@specgate-studio/host";

/** Folders Explorer never lists: dependencies, git and build output. */
const IGNORED = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  "target",
  ".next",
  "coverage",
]);
const LIMIT = 50_000;

/**
 * The project's files on disk for Explorer and the tabs. A plain walk for now;
 * the workspace module's FileSystemPort replaces it.
 */
export function nodeFiles(projectDir: string): ProjectFiles {
  const root = path.resolve(projectDir);
  return {
    async list() {
      const out: string[] = [];
      const walk = async (dir: string): Promise<void> => {
        if (out.length >= LIMIT) return;
        const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
        entries.sort((a, b) => a.name.localeCompare(b.name));
        for (const e of entries) {
          if (out.length >= LIMIT) return;
          const full = path.join(dir, e.name);
          if (e.isDirectory()) {
            if (!IGNORED.has(e.name)) await walk(full);
          } else if (e.isFile()) out.push(path.relative(root, full).split(path.sep).join("/"));
        }
      };
      await walk(root);
      return out;
    },
    async read(rel) {
      return fs.readFile(inside(root, rel), "utf8");
    },
    async write(rel, text) {
      await fs.writeFile(inside(root, rel), text, "utf8");
    },
  };
}

/** A path of the project, never one outside it. */
function inside(root: string, rel: string): string {
  const file = path.resolve(root, rel);
  if (!file.startsWith(root + path.sep)) throw new Error("not a file of the project");
  return file;
}
