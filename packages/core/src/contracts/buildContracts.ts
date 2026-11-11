import type { GitPort, GitWriter } from "../ports/GitPort.js";
import type { PortCheck } from "./workspaceContracts.js";

function must(ok: boolean, why: string): void {
  if (!ok) throw new Error(why);
}

const sorted = (files: readonly string[] | null) => JSON.stringify([...(files ?? [])].sort());

/**
 * A repository whose last commit holds `committed`, with `uncommitted` files
 * written since (new or changed) and `deleted` ones removed.
 */
export type MakeGitWriter = (repo: {
  committed: string[];
  uncommitted: string[];
  deleted: string[];
}) => Promise<{ port: GitPort & GitWriter; root: string }>;

/** What Build writes to git, against the fake and the Node adapter (draft-build-live REQ-102). */
export const GIT_WRITER_CONTRACT: PortCheck<MakeGitWriter>[] = [
  {
    name: "a commit holds exactly the files given — new, changed or deleted — and the others stay uncommitted",
    async run(make) {
      const { port, root } = await make({
        committed: ["README.md", "src/old.ts", "src/gone.ts"],
        uncommitted: ["src/new.ts", "src/old.ts", "apps/web/b c.tsx", "spec.md"],
        deleted: ["src/gone.ts"],
      });
      const files = ["src/new.ts", "src/old.ts", "src/gone.ts", "apps/web/b c.tsx"];
      const out: string[] = [];
      const code = await port.commit(root, files, "Work in progress before building REQ-030", (c) =>
        out.push(c),
      );
      must(code === 0, `the commit passed: ${out.join("")}`);
      const left = await port.uncommitted(root);
      must(sorted(left) === sorted(["spec.md"]), `only spec.md is left: ${sorted(left)}`);
    },
  },
  {
    name: "a stash takes every uncommitted file, untracked ones included",
    async run(make) {
      const { port, root } = await make({
        committed: ["README.md", "src/old.ts"],
        uncommitted: ["src/new.ts", "src/old.ts"],
        deleted: [],
      });
      const out: string[] = [];
      const code = await port.stash(root, "before building REQ-030", (c) => out.push(c));
      must(code === 0, `the stash passed: ${out.join("")}`);
      must(sorted(await port.uncommitted(root)) === "[]", "nothing is left uncommitted");
    },
  },
];
