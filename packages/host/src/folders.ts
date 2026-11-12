import {
  LANGS,
  clonePlan,
  fileNotice,
  type CommandEvent,
  type FoldersPort,
  type HelpVars,
  type Lang,
  type Notice,
  type ProgramPort,
} from "@specgate-studio/core";
import type { Notifications } from "@specgate-studio/protocol";

type Broadcast = <N extends keyof Notifications>(method: N, params: Notifications[N]) => void;
type Refuse = (message: string) => Error;

/** Opening a folder and cloning a repository (draft-workbench-v2 REQ-185). */
export interface FoldersWiring {
  folders: FoldersPort;
  programs: ProgramPort;
  /** Opens a folder as a project in a host of its own; its page's URL. */
  open(path: string): Promise<{ url: string }>;
  /** Whether no folder is open: the host was started without one. */
  none?: boolean;
}

/** Each clone's run number, apart from the specgate commands'. */
let runs = 1_000_000;

/**
 * `folder.get`, `folder.browse`, `folder.open` and `folder.clone` (REQ-185):
 * the folder chooser walks the Developer's folders from their home; Clone
 * runs `gh repo clone` when `gh auth status` says the GitHub CLI is signed
 * in, `git clone` otherwise (A33), echoed in the studio's terminal as every
 * command the studio runs, never into a folder that already exists.
 */
export function attachFolders(
  wiring: FoldersWiring,
  broadcast: Broadcast,
  refuse: Refuse,
): { handlers: Record<string, (params: unknown) => Promise<unknown>> } {
  const { folders } = wiring;
  const text = (v: unknown, max = 4096): v is string =>
    typeof v === "string" && v.length > 0 && v.length <= max && !v.includes("\0");
  const notices = (
    vars: HelpVars,
    outcome: Parameters<typeof fileNotice>[3],
  ): Record<Lang, Notice> =>
    Object.fromEntries(
      LANGS.map((l) => [l, fileNotice("folder-clone", l, vars, outcome)]),
    ) as Record<Lang, Notice>;
  const signedIn = async (cwd: string) =>
    (await wiring.programs.run("gh", ["auth", "status"], cwd, () => undefined)) === 0;

  const handlers: Record<string, (params: unknown) => Promise<unknown>> = {
    "folder.get": async () => ({ open: !wiring.none, home: folders.home() }),
    "folder.browse": async (params) => {
      const p = (params as { path?: unknown } | null)?.path;
      const dir = p === undefined || p === "" ? folders.home() : p;
      if (!text(dir)) throw refuse("a folder's path");
      return { path: dir, parent: folders.parent(dir), folders: await folders.folders(dir) };
    },
    "folder.open": async (params) => {
      const p = (params as { path?: unknown } | null)?.path;
      if (!text(p) || !(await folders.exists(p))) throw refuse("a folder that exists");
      return wiring.open(p);
    },
    "folder.clone": async (params) => {
      const { repo, parent } = (params ?? {}) as { repo?: unknown; parent?: unknown };
      if (!text(repo, 512) || !text(parent) || !(await folders.exists(parent)))
        throw refuse("a repository and a folder that exists");
      const gh = await signedIn(parent);
      const plan = clonePlan(repo, parent, gh, (d, n) => folders.join(d, n));
      if (!plan)
        return {
          ok: false,
          path: parent,
          notice: notices(
            { repo, path: parent },
            { ok: false, failed: "not owner/name or a repository's URL" },
          ),
        };
      const vars = { repo: repo.trim(), path: plan.dest };
      if (await folders.exists(plan.dest))
        return {
          ok: false,
          path: plan.dest,
          notice: notices(vars, { ok: false, refused: "exists" }),
        };
      const run = ++runs;
      const event = (e: CommandEvent) => broadcast("command.event", e);
      event({ type: "started", run, command: plan.shown });
      const code = await wiring.programs.run(plan.program, plan.args, parent, (chunk) =>
        event({ type: "output", run, chunk }),
      );
      const ok = code === 0;
      const notice = notices(
        vars,
        ok ? { ok: true } : { ok: false, failed: `${plan.program} exited with ${code}` },
      );
      event({ type: "ended", run, exitCode: code, notice });
      if (!ok) return { ok, path: plan.dest, notice };
      const { url } = await wiring.open(plan.dest);
      return { ok, path: plan.dest, url, notice };
    },
  };
  return { handlers };
}
