import {
  LANGS,
  OPEN_FOLDERS_KEY,
  childPath,
  cleanOpenFolders,
  fileNotice,
  letterOf,
  sortEntries,
  validName,
  type ActionId,
  type FileOutcome,
  type GitLetter,
  type GitPort,
  type HelpVars,
  type Lang,
  type Notice,
  type OpenFolders,
  type StorePort,
  type TreeEntry,
} from "@specgate-studio/core";
import type { Notifications } from "@specgate-studio/protocol";
import { insideProject, type ProjectFiles } from "./files.js";

export { insideProject };

type Broadcast = <N extends keyof Notifications>(method: N, params: Notifications[N]) => void;
type Refuse = (message: string) => Error;

/** The ports the Explorer needs (draft-explorer-tree). */
export interface ExplorerWiring {
  files: ProjectFiles;
  /** Git's letters (REQ-163); none without it. */
  git?: Pick<GitPort, "changes">;
  /** Where the folders left open are kept per project (REQ-161, A4); in memory without it. */
  store?: StorePort;
}

/** The file of every requirement: the spec, the capabilities and the open changes' deltas. */
const SPEC_FILE =
  /^(spec\.md|docs\/specs\/capabilities\/[^/]+\/spec\.md|docs\/specs\/changes\/(?!archive\/)[^/]+\/specs\/[^/]+\/spec\.md)$/;

/**
 * The Explorer in the host (draft-explorer-tree): one folder's entries
 * (REQ-161), git's letters (REQ-163), the folders left open per project,
 * where a requirement is written (REQ-169), and the tree's writes (REQ-166) —
 * each checked for its path here, then again by the file port for where it
 * really lands, and each ending with its notice in both languages (REQ-168).
 * These requests reach the host only on the studio's own WebSocket, which
 * the Origin check guards, as `file.write`.
 */
export function attachExplorer(
  projectDir: string,
  wiring: ExplorerWiring,
  broadcast: Broadcast,
  refuse: Refuse,
): { handlers: Record<string, (params: unknown) => Promise<unknown>> } {
  const { files } = wiring;
  let memory: OpenFolders = {};
  const readOpen = async (): Promise<OpenFolders> =>
    wiring.store ? ((await wiring.store.read<OpenFolders>(OPEN_FOLDERS_KEY)) ?? {}) : memory;
  const writeOpen = async (all: OpenFolders) => {
    if (wiring.store) await wiring.store.write(OPEN_FOLDERS_KEY, all);
    else memory = all;
  };

  const both = (action: ActionId, vars: HelpVars, outcome: FileOutcome) =>
    Object.fromEntries(LANGS.map((l) => [l, fileNotice(action, l, vars, outcome)])) as Record<
      Lang,
      Notice
    >;

  /** Runs one write, and says how it went: refusals are answers, not errors. */
  const write = async (
    action: ActionId,
    vars: HelpVars & { path: string },
    names: string[],
    paths: unknown[],
    run: (() => Promise<void>) | undefined,
  ) => {
    let outcome: FileOutcome;
    if (!paths.every(insideProject)) outcome = { ok: false, refused: "outside" };
    else if (!names.every(validName)) outcome = { ok: false, refused: "name" };
    else if (!run) outcome = { ok: false, failed: "this studio cannot write files" };
    else {
      try {
        await run();
        outcome = { ok: true };
      } catch (e) {
        const code = (e as { code?: unknown }).code;
        outcome =
          code === "outside" || code === "exists" || code === "missing"
            ? { ok: false, refused: code }
            : { ok: false, failed: e instanceof Error ? e.message : String(e) };
      }
    }
    if (outcome.ok) broadcast("files.changed", { paths: paths as string[] });
    return { ok: outcome.ok, path: vars.to ?? vars.path, notice: both(action, vars, outcome) };
  };

  const handlers: Record<string, (params: unknown) => Promise<unknown>> = {
    "files.children": async (params) => {
      const p = (params as { path?: unknown } | null)?.path ?? "";
      if (p !== "" && !insideProject(p)) throw refuse("not a folder of the project");
      if (!files.children) return { entries: [] };
      const dir = p as string;
      const entries: TreeEntry[] = sortEntries(
        (await files.children(dir)).map((e) => ({
          name: e.name,
          dir: e.dir,
          path: childPath(dir, e.name),
        })),
      );
      return { entries };
    },
    "files.status": async () => {
      const raw = wiring.git?.changes ? await wiring.git.changes(projectDir) : null;
      const changes: Record<string, GitLetter> = {};
      for (const [file, xy] of Object.entries(raw ?? {})) {
        const letter = letterOf(xy);
        if (letter) changes[file] = letter;
      }
      return { changes };
    },
    "explorer.open.get": async () => ({ open: cleanOpenFolders((await readOpen())[projectDir]) }),
    "explorer.open.set": async (params) => {
      const open = cleanOpenFolders((params as { open?: unknown } | null)?.open);
      const all = await readOpen();
      await writeOpen({ ...all, [projectDir]: open });
      return {};
    },
    "file.create": async (params) => {
      const { path, dir } = (params ?? {}) as { path?: unknown; dir?: unknown };
      const name = typeof path === "string" ? (path.split("/").pop() ?? "") : "";
      return write(
        dir === true ? "folder-new" : "file-new",
        { path: String(path ?? "") },
        [name],
        [path],
        files.create && insideProject(path) ? () => files.create!(path, dir === true) : undefined,
      );
    },
    "file.rename": async (params) => {
      const { from, to } = (params ?? {}) as { from?: unknown; to?: unknown };
      const name = typeof to === "string" ? (to.split("/").pop() ?? "") : "";
      return write(
        "file-rename",
        { path: String(from ?? ""), to: String(to ?? "") },
        [name],
        [from, to],
        files.rename && insideProject(from) && insideProject(to)
          ? () => files.rename!(from, to)
          : undefined,
      );
    },
    "file.delete": async (params) => {
      const { path, permanent } = (params ?? {}) as { path?: unknown; permanent?: unknown };
      return write(
        permanent === true ? "file-delete-permanent" : "file-delete",
        { path: String(path ?? "") },
        [],
        [path],
        files.remove && insideProject(path)
          ? () => files.remove!(path, permanent === true)
          : undefined,
      );
    },
    "requirement.locate": async (params) => {
      const req = (params as { req?: unknown } | null)?.req;
      if (typeof req !== "string" || !/^REQ-\d+$/.test(req)) throw refuse("not a requirement id");
      const heading = new RegExp(`^###\\s+Requirement:\\s+${req}\\b`);
      const candidates = (await files.list()).filter((f) => SPEC_FILE.test(f));
      // The open changes first: a requirement being drafted is read where it is written.
      candidates.sort((a, b) => Number(b.includes("/changes/")) - Number(a.includes("/changes/")));
      for (const f of candidates) {
        const text = await files.read(f).catch(() => "");
        const lines = text.split(/\r?\n/);
        const i = lines.findIndex((l) => heading.test(l));
        if (i >= 0) return { path: f, line: i + 1 };
      }
      return null;
    },
  };
  return { handlers };
}
