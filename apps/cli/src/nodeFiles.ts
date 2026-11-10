import * as fs from "node:fs/promises";
import * as path from "node:path";
import { IgnoreRules } from "@specgate-studio/core";
import type { ProjectFiles } from "@specgate-studio/host";

const LIMIT = 50_000;

/**
 * The project's files on disk for Explorer and the tabs: not dependencies, git,
 * build output or what the project's .gitignore names — the workspace's
 * ignore rules (draft-workspace REQ-022).
 */
export function nodeFiles(projectDir: string): ProjectFiles {
  const root = path.resolve(projectDir);
  return {
    async list() {
      const gitignore = await fs.readFile(path.join(root, ".gitignore"), "utf8").catch(() => "");
      const rules = new IgnoreRules(gitignore);
      const out: string[] = [];
      const walk = async (dir: string): Promise<void> => {
        if (out.length >= LIMIT) return;
        const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
        entries.sort((a, b) => a.name.localeCompare(b.name));
        for (const e of entries) {
          if (out.length >= LIMIT) return;
          const full = path.join(dir, e.name);
          const rel = path.relative(root, full).split(path.sep).join("/");
          if (rules.ignores(rel)) continue;
          if (e.isDirectory()) await walk(full);
          else if (e.isFile()) out.push(rel);
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
