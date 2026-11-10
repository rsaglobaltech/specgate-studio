import type { FileSystemPort } from "../ports/FileSystemPort.js";
import type { GitPort } from "../ports/GitPort.js";
import type { StorePort } from "../ports/StorePort.js";
import type { WatcherPort } from "../ports/WatcherPort.js";

/**
 * The contracts of the workspace's ports (ADR-0001): each is run against the
 * in-memory fake and the Node adapter, which are used only when they pass.
 * A check gets a `make` that sets up the state it needs and answers the port.
 */
export interface PortCheck<Make> {
  name: string;
  run(make: Make): Promise<void>;
}

function must(ok: boolean, why: string): void {
  if (!ok) throw new Error(why);
}

/** A folder with these files (relative path → text); answers the port and the root. */
export type MakeFileSystem = (
  files: Record<string, string>,
) => Promise<{ port: FileSystemPort; root: string }>;

export const FILE_SYSTEM_CONTRACT: PortCheck<MakeFileSystem>[] = [
  {
    name: "a file and its folders exist; a missing one does not",
    async run(make) {
      const { port, root } = await make({ "docs/specs/traceability.md": "# m\n" });
      must(await port.exists(`${root}/docs/specs/traceability.md`), "the file exists");
      must(await port.exists(`${root}/docs/specs`), "its folder exists");
      must(!(await port.exists(`${root}/spec.md`)), "a missing file does not");
    },
  },
  {
    name: "a folder lists its names; a missing folder lists nothing",
    async run(make) {
      const { port, root } = await make({ "a.txt": "a", "src/b.ts": "b" });
      must(
        JSON.stringify((await port.list(root)).sort()) === JSON.stringify(["a.txt", "src"]),
        "the root lists a.txt and src",
      );
      must((await port.list(`${root}/nope`)).length === 0, "a missing folder lists nothing");
    },
  },
  {
    name: "a text reads back as written; a missing file reads null",
    async run(make) {
      const { port, root } = await make({ ".gitignore": "dist\r\n/tmp/\n" });
      must(
        (await port.readText(`${root}/.gitignore`)) === "dist\r\n/tmp/\n",
        "the text as written",
      );
      must((await port.readText(`${root}/nope.txt`)) === null, "null when missing");
    },
  },
];

/** A repository on `branch` with these uncommitted files (relative, `/`). */
export type MakeGit = (repo: {
  branch: string;
  uncommitted: string[];
}) => Promise<{ port: GitPort; root: string; notARepo: string }>;

export const GIT_CONTRACT: PortCheck<MakeGit>[] = [
  {
    name: "the branch, including one named feature/<team>/<KEY>",
    async run(make) {
      const { port, root } = await make({ branch: "feature/pagos/SPR-42", uncommitted: [] });
      must((await port.branch(root)) === "feature/pagos/SPR-42", "the branch as named");
    },
  },
  {
    name: "every uncommitted file once, relative with /",
    async run(make) {
      const files = ["spec.md", "packages/core/src/a.ts", "apps/web/b c.tsx"];
      const { port, root } = await make({ branch: "main", uncommitted: files });
      const got = (await port.uncommitted(root)) ?? [];
      must(
        JSON.stringify([...got].sort()) === JSON.stringify([...files].sort()),
        `uncommitted ${JSON.stringify(got)}`,
      );
    },
  },
  {
    name: "a folder that is not a repository answers null",
    async run(make) {
      const { port, notARepo } = await make({ branch: "main", uncommitted: [] });
      must((await port.uncommitted(notARepo)) === null, "uncommitted is null");
      must((await port.branch(notARepo)) === null, "branch is null");
    },
  },
];

/** A folder being watched; `write` saves a file of it (relative path). */
export type MakeWatcher = () => Promise<{
  port: WatcherPort;
  root: string;
  write(path: string): Promise<void>;
}>;

const until = async (ok: () => boolean, ms: number) => {
  const end = Date.now() + ms;
  while (!ok() && Date.now() < end) await new Promise((r) => setTimeout(r, 10));
  return ok();
};

export const WATCHER_CONTRACT: PortCheck<MakeWatcher>[] = [
  {
    name: "a saved file is told, relative with /",
    async run(make) {
      const { port, root, write } = await make();
      const seen: string[] = [];
      const watch = await port.watch(
        root,
        () => false,
        (p) => seen.push(p),
      );
      try {
        await write("docs/specs/changes/draft-pedidos/questions.md");
        must(
          await until(() => seen.includes("docs/specs/changes/draft-pedidos/questions.md"), 2000),
          `told ${JSON.stringify(seen)}`,
        );
      } finally {
        await watch.close();
      }
    },
  },
  {
    name: "an ignored path is not told",
    async run(make) {
      const { port, root, write } = await make();
      const seen: string[] = [];
      const watch = await port.watch(
        root,
        (p) => p === "node_modules" || p.startsWith("node_modules/"),
        (p) => seen.push(p),
      );
      try {
        await write("node_modules/left-pad/index.js");
        await write("spec.md");
        must(await until(() => seen.includes("spec.md"), 2000), "spec.md told");
        must(!seen.some((p) => p.startsWith("node_modules")), `told ${JSON.stringify(seen)}`);
      } finally {
        await watch.close();
      }
    },
  },
];

export type MakeStore = () => Promise<StorePort>;

export const STORE_CONTRACT: PortCheck<MakeStore>[] = [
  {
    name: "a value reads back as written; a key never written reads null",
    async run(make) {
      const store = await make();
      must((await store.read("recent-projects")) === null, "null before a write");
      const value = [{ path: "/p/sprich", name: "sprich", openedAt: "2026-11-10T09:00:00.000Z" }];
      await store.write("recent-projects", value);
      must(
        JSON.stringify(await store.read("recent-projects")) === JSON.stringify(value),
        "the value as written",
      );
    },
  },
];
