/**
 * Clone Repository (draft-workbench-v2 REQ-185, A33): the command that clones
 * a repository into the folder the Developer chose — `gh repo clone` when the
 * GitHub CLI is signed in, `git clone` otherwise. Pure: the host runs it.
 */

export interface ClonePlan {
  program: "gh" | "git";
  args: string[];
  /** The folder the repository lands in: the chosen folder and its name. */
  dest: string;
  name: string;
  /** The command as the terminal shows it. */
  shown: string;
}

const SLUG = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const HTTPS = /^https:\/\/[A-Za-z0-9.-]+(:\d+)?\/[A-Za-z0-9_.~\/-]+$/;
const SSH = /^git@[A-Za-z0-9.-]+:[A-Za-z0-9_.~\/-]+$/;

/** The repository's folder name: its last part without `.git`; null for no repository. */
export function repoName(repo: string): string | null {
  const r = repo.trim();
  if (!(SLUG.test(r) || HTTPS.test(r) || SSH.test(r))) return null;
  const name = r
    .replace(/\/+$/, "")
    .split(/[/:]/)
    .pop()!
    .replace(/\.git$/, "");
  return name && name !== "." && name !== ".." && !name.startsWith("-") ? name : null;
}

/**
 * The plan to clone `repo` into `parent`, or null when `repo` is neither
 * `owner/name` nor an https or ssh URL. `join` is the platform's path join.
 */
export function clonePlan(
  repo: string,
  parent: string,
  ghSignedIn: boolean,
  join: (dir: string, name: string) => string,
): ClonePlan | null {
  const r = repo.trim();
  const name = repoName(r);
  if (!name || r.startsWith("-") || r.split("/").some((p) => p === "..")) return null;
  const dest = join(parent, name);
  const args = ghSignedIn
    ? ["repo", "clone", r, dest]
    : ["clone", SLUG.test(r) ? `https://github.com/${r}.git` : r, dest];
  const program = ghSignedIn ? "gh" : "git";
  return { program, args, dest, name, shown: [program, ...args].join(" ") };
}
