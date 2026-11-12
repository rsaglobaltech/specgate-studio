import * as fs from "node:fs/promises";
import * as path from "node:path";
import { EXCLUDED_NAMES, IgnoreRules, type GitPort } from "@specgate-studio/core";
import type { ProjectFiles } from "@specgate-studio/host";
import { systemTrash, type Trash } from "@specgate-studio/adapter-node";

const LIMIT = 50_000;

/** A refusal of the file port, with the code the host turns into its notice (REQ-166). */
function refusal(code: "outside" | "exists" | "missing", message: string): Error {
  return Object.assign(new Error(message), { code });
}

/**
 * The project's files on disk for Explorer and the tabs; `list()` leaves out
 * dependencies, git, build output and what the project's .gitignore names,
 * which `children()` marks as ignored instead (draft-workbench-v2 REQ-186) — the workspace's
 * ignore rules (draft-workspace REQ-022), and git's own reading of
 * .gitignore, wildcards and `!` included, when git is given
 * (draft-explorer-tree A18).
 *
 * The tree's writes (REQ-166) never leave the project: a path is resolved,
 * and the real location of the folder it is written in — links resolved —
 * must be the project's own; nothing is overwritten; Delete goes to the
 * system's trash (A24), Shift+Delete removes for good.
 */
export function nodeFiles(
  projectDir: string,
  options: { git?: Pick<GitPort, "ignored">; trash?: Trash } = {},
): ProjectFiles {
  const root = path.resolve(projectDir);
  const trash = options.trash ?? systemTrash();
  let realRoot: Promise<string> | null = null;
  const real = () => (realRoot ??= fs.realpath(root).catch(() => root));
  const rules = async () =>
    new IgnoreRules(await fs.readFile(path.join(root, ".gitignore"), "utf8").catch(() => ""));
  const gitIgnored = async (paths: string[]): Promise<Set<string>> =>
    options.git?.ignored
      ? options.git.ignored(root, paths).catch(() => new Set<string>())
      : new Set<string>();

  /** Refused unless the folder `abs` lands in, links resolved, is inside the project. */
  const inProject = async (abs: string) => {
    const top = await real();
    let at = path.dirname(abs);
    // The nearest folder that exists: a new file's folder may not yet.
    for (;;) {
      let r: string | null = null;
      try {
        r = await fs.realpath(at);
      } catch {
        r = null;
      }
      if (r !== null) {
        if (!within(top, r)) throw refusal("outside", "not inside the project");
        return;
      }
      const up = path.dirname(at);
      if (up === at) throw refusal("outside", "not inside the project");
      at = up;
    }
  };

  return {
    async list() {
      const ignore = await rules();
      const out: string[] = [];
      const walk = async (dir: string): Promise<void> => {
        if (out.length >= LIMIT) return;
        const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
        entries.sort((a, b) => a.name.localeCompare(b.name));
        for (const e of entries) {
          if (out.length >= LIMIT) return;
          const full = path.join(dir, e.name);
          const rel = path.relative(root, full).split(path.sep).join("/");
          if (ignore.ignores(rel)) continue;
          if (e.isDirectory()) await walk(full);
          else if (e.isFile()) out.push(rel);
        }
      };
      await walk(root);
      const git = await gitIgnored(out);
      return git.size ? out.filter((f) => !git.has(f)) : out;
    },
    async read(rel) {
      return fs.readFile(inside(root, rel), "utf8");
    },
    async write(rel, text) {
      await fs.writeFile(inside(root, rel), text, "utf8");
    },
    async children(rel) {
      const dir = rel ? inside(root, rel) : root;
      if (rel) await inProject(path.join(dir, "x"));
      const ignore = await rules();
      const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
      const out: Array<{ name: string; dir: boolean; rel: string; ignored: boolean }> = [];
      for (const e of entries) {
        // `.git` is never shown (REQ-186, A11): VS Code's files.exclude default.
        if (EXCLUDED_NAMES.has(e.name)) continue;
        const r = rel ? `${rel}/${e.name}` : e.name;
        let isDir = e.isDirectory();
        if (e.isSymbolicLink())
          isDir = await fs.stat(path.join(dir, e.name)).then(
            (s) => s.isDirectory(),
            () => false,
          );
        else if (!isDir && !e.isFile()) continue;
        out.push({ name: e.name, dir: isDir, rel: r, ignored: ignore.ignores(r) });
      }
      // git answers for a folder with its trailing `/`; only for what the rules let through.
      const git = await gitIgnored(
        out.filter((e) => !e.ignored).map((e) => (e.dir ? `${e.rel}/` : e.rel)),
      );
      // What is ignored is marked, never left out (draft-workbench-v2 REQ-186).
      return out.map(({ name, dir, rel: r, ignored }) => ({
        name,
        dir,
        ...(ignored || git.has(r) || git.has(`${r}/`) ? { ignored: true } : {}),
      }));
    },
    async create(rel, dir) {
      const target = inside(root, rel);
      await inProject(target);
      if (await exists(target)) throw refusal("exists", `${rel} already exists`);
      if (dir) await fs.mkdir(target, { recursive: true });
      else {
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, "", { flag: "wx" });
      }
    },
    async rename(from, to) {
      const a = inside(root, from);
      const b = inside(root, to);
      await inProject(a);
      await inProject(b);
      if (!(await exists(a))) throw refusal("missing", `${from} is not there`);
      // Only the case changes: the same file on macOS and Windows, not one in the way.
      const ino = (p: string) =>
        fs.lstat(p).then(
          (s) => s.ino,
          () => -1,
        );
      const sameFile = a.toLowerCase() === b.toLowerCase() && (await ino(a)) === (await ino(b));
      if (!sameFile && (await exists(b))) throw refusal("exists", `${to} already exists`);
      await fs.mkdir(path.dirname(b), { recursive: true });
      await fs.rename(a, b);
    },
    async remove(rel, permanent) {
      const target = inside(root, rel);
      await inProject(target);
      if (!(await exists(target))) throw refusal("missing", `${rel} is not there`);
      if (permanent) await fs.rm(target, { recursive: true, force: false });
      else await trash(target);
    },
  };
}

async function exists(p: string): Promise<boolean> {
  return fs.lstat(p).then(
    () => true,
    () => false,
  );
}

/** Whether `p` is `top` or inside it — without case on Windows and macOS. */
function within(top: string, p: string): boolean {
  const fold = process.platform === "win32" || process.platform === "darwin";
  const t = fold ? top.toLowerCase() : top;
  const q = fold ? p.toLowerCase() : p;
  return q === t || q.startsWith(t.endsWith(path.sep) ? t : t + path.sep);
}

/** A path of the project, never one outside it. */
function inside(root: string, rel: string): string {
  const file = path.resolve(root, rel);
  if (!file.startsWith(root + path.sep)) throw refusal("outside", "not a file of the project");
  return file;
}
