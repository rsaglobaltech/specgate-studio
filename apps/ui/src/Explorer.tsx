import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import type {
  ActionId,
  FileWriteResult,
  GitLetter,
  Lang,
  Notice,
  QuestionsSection,
  TreeEntry,
} from "@specgate-studio/protocol";
import type { Rpc } from "./rpc.js";
import { t } from "./i18n.js";
import { HelpButton, type HelpRequest } from "./Help.js";
import { VirtualList } from "./VirtualList.js";
import { FileIconView } from "./icons.js";
import {
  changedFolders,
  fileType,
  filteredRows,
  foldersAbove,
  isSpec,
  modulesOf,
  parentOf,
  visibleRows,
  type Row,
  type StatusRequirement,
} from "./tree.js";

/** The tree's rows are 26 px high (draft-explorer-tree Q1). */
export const TREE_ROW = 26;

export interface ExplorerProps {
  rpc: Rpc;
  lang: Lang;
  tr: (k: string, v?: Record<string, string | number>) => string;
  /** Every file of the project, for the filter and the counts (REQ-167, REQ-169). */
  files: readonly string[];
  requirements: readonly StatusRequirement[];
  changes: ReadonlyArray<{ id: string }>;
  questions: QuestionsSection | undefined;
  report: unknown;
  /** The open changes no person approved yet: their requirements are drafts (REQ-169). */
  unapproved: ReadonlySet<string>;
  /** Told the drafts to review, read when the Explorer opens. */
  onReview?: (ids: readonly string[]) => void;
  /** The requirement being built, if any (REQ-169). */
  building: string | null;
  /** The active editor tab: revealed in the tree (REQ-164). */
  activeFile: string | null;
  /** The requirement under the editor's cursor: highlighted in its module, opened first (REQ-169). */
  activeReq?: string | null;
  /** The project's name: the root of the spec explorer, as the board draws it. */
  project?: string;
  /** Bumped when the workspace changed: git's letters are read again (REQ-163). */
  workspaceStamp: unknown;
  filterRef: { current: HTMLInputElement | null };
  openFile: (path: string, line?: number, req?: { id: string; title: string }) => void;
  onHelp: (title: string, requests: HelpRequest[]) => void;
  onNotice: (notice: Record<Lang, Notice>) => void;
  onOpenTerminal: (cwd: string) => void;
  /** A write changed these paths: tabs follow a rename, close on a delete. */
  onRenamed: (from: string, to: string) => void;
  onDeleted: (path: string) => void;
  /** The project's files changed: the list behind the filter is read again. */
  onFilesChanged: () => void;
}

type Menu = { x: number; y: number; entry: TreeEntry } | null;
type Confirm = { path: string; permanent: boolean } | null;
type Creating = { dir: string; folder: boolean } | null;

/**
 * The Explorer's side panel (draft-explorer-tree): the specification and its
 * modules above (REQ-169), the files as a tree below, one folder read when
 * opened (REQ-161), in the boards' look (REQ-162), with git's letters
 * (REQ-163), the active file revealed (REQ-164), keys (REQ-165), a menu whose
 * writes go through the host (REQ-166), the filter inside the tree (REQ-167),
 * and a "?" with notices in both languages (REQ-168).
 */
export function Explorer(p: ExplorerProps) {
  const { rpc, tr } = p;
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [children, setChildren] = useState<Map<string, TreeEntry[]>>(new Map());
  const [selected, setSelected] = useState<string | null>(null);

  /** The requirement last opened from its module (REQ-169). */
  const [currentReq, setCurrentReq] = useState<string | null>(null);
  const [changes, setChanges] = useState<Record<string, GitLetter>>({});
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState<Menu>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [creating, setCreating] = useState<Creating>(null);
  const [show, setShow] = useState<{ index: number; n: number } | null>(null);
  const [sections, setSections] = useState({
    spec: true,
    modules: true,
    changes: true,
    capabilities: false,
    features: false,
  });
  const [openModules, setOpenModules] = useState<Set<string> | null>(null);
  const modulesRef = useRef<HTMLDivElement>(null);
  // The requirement in the editor, in view in its module (REQ-169).
  useEffect(() => {
    if (!p.activeReq) return;
    const t = window.setTimeout(() => {
      const row = modulesRef.current?.querySelector<HTMLElement>(`[data-req="${p.activeReq}"]`);
      const box = modulesRef.current;
      if (!row || !box) return;
      const top = row.offsetTop - box.offsetTop;
      if (top < box.scrollTop || top + row.offsetHeight > box.scrollTop + box.clientHeight)
        box.scrollTop = Math.max(0, top - box.clientHeight / 2);
    }, 50);
    return () => window.clearTimeout(t);
  }, [p.activeReq, openModules]);
  const treeRef = useRef<HTMLDivElement>(null);
  const reading = useRef(new Set<string>());

  const read = useCallback(
    async (dir: string) => {
      if (reading.current.has(dir)) return;
      reading.current.add(dir);
      try {
        const { entries } = await rpc.ask("files.children", { path: dir });
        setChildren((m) => new Map(m).set(dir, entries));
      } catch {
        // A folder gone, or outside the project: it reads as empty.
        setChildren((m) => new Map(m).set(dir, []));
      } finally {
        reading.current.delete(dir);
      }
    },
    [rpc],
  );

  // The folders left open last time, read before the first paint of the tree (REQ-161).
  useEffect(() => {
    let live = true;
    void Promise.all([
      read(""),
      rpc.ask("explorer.open.get", {}).then(
        ({ open: o }) => o,
        () => [] as string[],
      ),
    ]).then(async ([, o]) => {
      if (!live) return;
      await Promise.all(o.map((d) => read(d)));
      setOpen(new Set(o));
      setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, [rpc, read]);

  // Which open changes are drafts, for the modules' dots (REQ-169).
  useEffect(() => {
    let live = true;
    rpc.ask("changes.get", {}).then(
      (c) => live && p.onReview?.(c.groups.review.map((x) => x.id)),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [rpc, p.changes.map((c) => c.id).join(" ")]);

  // Kept per project, as they change (A4).
  useEffect(() => {
    if (loaded) void rpc.ask("explorer.open.set", { open: [...open] }).catch(() => undefined);
  }, [open, loaded, rpc]);

  // Git's letters, read again whenever the folder or git changes (REQ-163).
  const status = useCallback(
    () =>
      rpc.ask("files.status", {}).then(
        (s) => setChanges(s.changes),
        () => undefined,
      ),
    [rpc],
  );
  useEffect(() => void status(), [status, p.workspaceStamp]);

  // A write of the tree, or a file the watcher saw: the folders read so far are read again.
  const childrenRef = useRef(children);
  childrenRef.current = children;
  useEffect(() => {
    const again = (paths: string[]) => {
      const dirs = new Set(paths.map(parentOf));
      for (const d of dirs) if (childrenRef.current.has(d)) void read(d);
      void status();
      p.onFilesChanged();
    };
    const off = rpc.on("files.changed", ({ paths }) => again(paths));
    return off;
  }, [rpc, read, status]);
  useEffect(() => {
    for (const d of childrenRef.current.keys()) void read(d);
  }, [p.workspaceStamp]);

  const toggle = useCallback(
    (dir: string, want?: boolean) => {
      setOpen((o) => {
        const next = new Set(o);
        const opening = want ?? !o.has(dir);
        if (opening) {
          next.add(dir);
          if (!childrenRef.current.has(dir)) void read(dir);
        } else next.delete(dir);
        return next;
      });
    },
    [read],
  );

  const filtering = query.trim() !== "";
  const rows: Row[] = useMemo(
    () => (filtering ? filteredRows(p.files, query) : visibleRows(open, children)),
    [filtering, p.files, query, open, children],
  );
  const dots = useMemo(() => changedFolders(changes), [changes]);

  // The active editor's file: its folders opened, its row selected and in view (REQ-164).
  useEffect(() => {
    const f = p.activeFile;
    if (!f || !loaded) return;
    const above = foldersAbove(f);
    void Promise.all(above.filter((d) => !childrenRef.current.has(d)).map((d) => read(d)));
    setOpen((o) => (above.every((d) => o.has(d)) ? o : new Set([...o, ...above])));
    setSelected(f);
  }, [p.activeFile, loaded]);
  useEffect(() => {
    if (!selected) return;
    const i = rows.findIndex((r) => r.entry.path === selected);
    if (i >= 0) setShow((s) => ({ index: i, n: (s?.n ?? 0) + 1 }));
  }, [selected, rows.length]);

  const help = (action: ActionId, path?: string) =>
    p.onHelp(tr("help.title", { feature: tr(`tree.${action}`) }), [
      { action, feature: tr(`tree.${action}`), vars: path ? { path } : {} },
    ]);

  const done = (r: FileWriteResult) => {
    p.onNotice(r.notice);
    return r.ok;
  };

  const createIn = async (dir: string, name: string, folder: boolean) => {
    setCreating(null);
    const path = dir ? `${dir}/${name}` : name;
    const r = await rpc.ask("file.create", { path, dir: folder });
    if (!done(r)) return;
    if (dir) toggle(dir, true);
    setSelected(path);
    if (!folder) p.openFile(path);
  };

  const renameTo = async (from: string, name: string) => {
    setRenaming(null);
    if (!name || name === from.split("/").pop()) return;
    const parent = parentOf(from);
    const to = parent ? `${parent}/${name}` : name;
    const r = await rpc.ask("file.rename", { from, to });
    if (!done(r)) return;
    setOpen((o) => {
      if (!o.has(from)) return o;
      const next = new Set(o);
      next.delete(from);
      next.add(to);
      return next;
    });
    p.onRenamed(from, to);
    setSelected(to);
  };

  const remove = async (path: string, permanent: boolean) => {
    setConfirm(null);
    const r = await rpc.ask("file.delete", { path, permanent });
    if (!done(r)) return;
    p.onDeleted(path);
    setSelected(null);
  };

  const copy = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
    } catch {
      // A page without the clipboard's permission: the old way.
      const t = document.createElement("textarea");
      t.value = path;
      document.body.append(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    const say = (l: Lang): Notice => ({
      tone: "ok",
      ran: t(l, "tree.copied", { path }),
      wrote: t(l, "tree.copiedWrote"),
      next: t(l, "tree.copiedNext"),
    });
    p.onNotice({ en: say("en"), es: say("es") });
  };

  const choose = (entry: TreeEntry) => {
    setSelected(entry.path);
    if (entry.dir) {
      if (!filtering) toggle(entry.path);
    } else p.openFile(entry.path);
  };

  // The tree by keyboard (REQ-165, A11).
  const onKey = (e: KeyboardEvent) => {
    if (renaming || creating || confirm) return;
    const i = rows.findIndex((r) => r.entry.path === selected);
    const row = i >= 0 ? rows[i]! : null;
    const go = (j: number) => {
      const r = rows[Math.max(0, Math.min(rows.length - 1, j))];
      if (r) setSelected(r.entry.path);
    };
    const mac = /Mac/.test(navigator.platform);
    switch (e.key) {
      case "ArrowDown":
        go(i + 1);
        break;
      case "ArrowUp":
        go(i < 0 ? 0 : i - 1);
        break;
      case "Home":
        go(0);
        break;
      case "End":
        go(rows.length - 1);
        break;
      case "ArrowRight":
        if (row?.entry.dir) {
          if (!open.has(row.entry.path) && !filtering) toggle(row.entry.path, true);
          else go(i + 1);
        }
        break;
      case "ArrowLeft":
        if (row?.entry.dir && open.has(row.entry.path) && !filtering) toggle(row.entry.path, false);
        else if (row) {
          const up = parentOf(row.entry.path);
          if (up) setSelected(up);
        }
        break;
      case "Enter":
        if (row) choose(row.entry);
        break;
      case "F2":
        if (row) setRenaming(row.entry.path);
        break;
      case "Delete":
        if (row) setConfirm({ path: row.entry.path, permanent: e.shiftKey });
        break;
      case "Backspace":
        if (row && mac && e.metaKey) setConfirm({ path: row.entry.path, permanent: false });
        else return;
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  };

  // The spec's sections above the tree (REQ-169, A26).
  const questionsOf = (change: string) =>
    (p.questions?.questions?.open ?? []).filter((q) => q.change === change).length;
  const capabilityNames = useMemo(
    () =>
      [
        ...new Set(
          p.files
            .map((f) => /^docs\/specs\/capabilities\/([^/]+)\//.exec(f)?.[1])
            .filter((x): x is string => !!x),
        ),
      ].sort(),
    [p.files],
  );
  const capabilities = capabilityNames.length;
  const featureFolders = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of p.files)
      if (f.startsWith("features/") && f.endsWith(".feature")) {
        const folder = f.split("/").slice(0, -1).join("/");
        m.set(folder, (m.get(folder) ?? 0) + 1);
      }
    return [...m].sort((a, b) => a[0].localeCompare(b[0]));
  }, [p.files]);
  const features = featureFolders.reduce((n, [, c]) => n + c, 0);
  const modules = useMemo(
    () => modulesOf(p.requirements, p.report, { building: p.building, unapproved: p.unapproved }),
    [p.requirements, p.report, p.building, p.unapproved],
  );
  // The module of the requirement in the editor opens first, then the first one (REQ-169).
  const activeModule = p.activeReq
    ? modules.find((m) => m.requirements.some((r) => r.id === p.activeReq))?.name
    : undefined;
  const shownModules = new Set([
    ...(openModules ?? modules.slice(0, 1).map((m) => m.name)),
    ...(activeModule ? [activeModule] : []),
  ]);
  const built = p.requirements.filter((r) => r.category === "DONE").length;
  const reveal = (folder: string) => {
    const all = [...foldersAbove(`${folder}/x`)];
    void Promise.all(all.map((d) => read(d)));
    setOpen((o) => new Set([...o, ...all]));
    setSelected(folder);
  };
  const openRequirement = async (id: string) => {
    setCurrentReq(id);
    const at = await rpc.ask("requirement.locate", { req: id }).catch(() => null);
    const title = p.requirements.find((r) => r.id === id)?.title ?? "";
    if (at) p.openFile(at.path, at.line, { id, title });
  };

  const specRow = (
    key: string,
    label: string,
    opts: {
      depth?: number;
      badge?: string | null;
      right?: string;
      rightTone?: string;
      onClick: () => void;
      current?: boolean;
      letter?: GitLetter | undefined;
    },
  ) => (
    <button
      type="button"
      class="tr"
      key={key}
      data-key={key}
      aria-current={opts.current ? "true" : undefined}
      style={{ paddingLeft: `${10 + (opts.depth ?? 0) * 14}px` }}
      onClick={opts.onClick}
    >
      {opts.badge && <span class="ft">{opts.badge}</span>}
      <span class="name">{label}</span>
      {opts.right && <span class={`right ${opts.rightTone ?? ""}`}>{opts.right}</span>}
      {opts.letter && (
        <span class="gl" data-letter={opts.letter}>
          {opts.letter}
        </span>
      )}
    </button>
  );

  return (
    <aside class="side explorer" aria-label={tr("explorer.files")} data-testid="explorer">
      <div class="shead">
        <span>{tr("tree.title")}</span>
        <HelpButton label={tr("tree.helpLabel")} onOpen={() => help("explorer")} />
      </div>

      <div class="shead sub">
        <span>{tr("tree.spec")}</span>
      </div>
      <div class="ssec" data-section="spec">
        <button
          type="button"
          class="tr root"
          aria-expanded={sections.spec}
          data-key="root"
          onClick={() => setSections((s) => ({ ...s, spec: !s.spec }))}
        >
          <span class="name">
            {sections.spec ? "▾" : "▸"} {p.project || tr("tree.spec")}
          </span>
        </button>
        {sections.spec && (
          <>
            {specRow("spec.md", "spec.md", {
              depth: 1,
              badge: "MD",
              onClick: () => p.openFile("spec.md"),
              current: p.activeFile === "spec.md",
              letter: changes["spec.md"],
            })}
            {specRow("docs/brief.md", "docs/brief.md", {
              depth: 1,
              badge: "MD",
              onClick: () => p.openFile("docs/brief.md"),
              current: p.activeFile === "docs/brief.md",
              letter: changes["docs/brief.md"],
            })}
            {specRow("changes", `${sections.changes ? "▾" : "▸"} ${tr("tree.openChanges")}`, {
              depth: 1,
              onClick: () => setSections((s) => ({ ...s, changes: !s.changes })),
            })}
            {sections.changes &&
              p.changes.map((c) => {
                const n = questionsOf(c.id);
                const ticket = /^([a-z]+-\d+)(-|$)/i.exec(c.id)?.[1]?.toUpperCase();
                return specRow(`change:${c.id}`, c.id, {
                  depth: 2,
                  right: n
                    ? tr(n === 1 ? "tree.question" : "tree.questions", { n })
                    : (ticket ?? ""),
                  rightTone: n ? "warn" : "",
                  onClick: () => reveal(`docs/specs/changes/${c.id}`),
                });
              })}
            {specRow(
              "capabilities",
              `${sections.capabilities ? "▾" : "▸"} ${tr("tree.capabilities", { n: capabilities })}`,
              {
                depth: 1,
                onClick: () => setSections((s) => ({ ...s, capabilities: !s.capabilities })),
              },
            )}
            {sections.capabilities &&
              capabilityNames.map((c) =>
                specRow(`capability:${c}`, c, {
                  depth: 2,
                  badge: "MD",
                  onClick: () => p.openFile(`docs/specs/capabilities/${c}/spec.md`),
                  current: p.activeFile === `docs/specs/capabilities/${c}/spec.md`,
                }),
              )}
            {specRow(
              "features",
              `${sections.features ? "▾" : "▸"} ${tr("tree.features", { n: features })}`,
              {
                depth: 1,
                onClick: () => setSections((s) => ({ ...s, features: !s.features })),
              },
            )}
            {sections.features &&
              featureFolders.map(([folder, n]) =>
                specRow(`features:${folder}`, folder.replace(/^features\//, "") || folder, {
                  depth: 2,
                  right: String(n),
                  onClick: () => reveal(folder),
                }),
              )}
          </>
        )}
      </div>

      <div class="shead sub">
        <span>{tr("tree.modules")}</span>
        <span class="count">
          {built}/{p.requirements.length}
        </span>
      </div>
      <div class="ssec modules" data-section="modules" ref={modulesRef}>
        {modules.map((m) => {
          const isOpen = shownModules.has(m.name);
          return (
            <div key={m.name} data-module={m.name}>
              <button
                type="button"
                class="tr"
                aria-expanded={isOpen}
                onClick={() =>
                  setOpenModules(() => {
                    const next = new Set(shownModules);
                    if (isOpen) next.delete(m.name);
                    else next.add(m.name);
                    return next;
                  })
                }
              >
                <span class="name">
                  {isOpen ? "▾" : "▸"} {m.name}
                </span>
                <span class="right">
                  {m.built}/{m.requirements.length}
                </span>
              </button>
              {isOpen &&
                m.requirements.map((r) => (
                  <button
                    type="button"
                    class="tr"
                    key={r.id}
                    data-req={r.id}
                    data-state={r.state}
                    aria-current={(p.activeReq ?? currentReq) === r.id ? "true" : undefined}

                    style={{ paddingLeft: "24px" }}
                    onClick={() => void openRequirement(r.id)}
                  >
                    <span class={`rdot ${r.state}`} />
                    <span class="rid">
                      <span class="sr">REQ-</span>
                      {r.id.replace(/^REQ-/, "")}
                    </span>
                    <span class="name">{r.title}</span>
                  </button>
                ))}
            </div>
          );
        })}
      </div>

      <div class="shead sub">
        {/* The project's root, named after it (draft-workbench-v2 REQ-186). */}
        <span data-testid="tree-root">
          {(p.workspaceStamp as { name?: string } | null)?.name || p.project || tr("tree.files")}
        </span>
      </div>
      <input
        ref={p.filterRef}
        class="filter"
        value={query}
        placeholder={tr("tree.filter")}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        aria-label={tr("explorer.files")}
      />
      <div
        class="tree"
        role="tree"
        tabIndex={0}
        ref={treeRef}
        aria-label={tr("tree.files")}
        onKeyDown={onKey}
        data-loaded={loaded ? "1" : undefined}
      >
        {creating && (
          <NameInput
            depth={creating.dir ? creating.dir.split("/").length : 0}
            placeholder={creating.folder ? tr("tree.folderName") : tr("tree.fileName")}
            initial=""
            onDone={(name) =>
              name ? void createIn(creating.dir, name, creating.folder) : setCreating(null)
            }
          />
        )}
        <VirtualList
          count={rows.length}
          rowHeight={TREE_ROW}
          show={show}
          row={(i) => {
            const { entry, depth } = rows[i]!;
            const letter = entry.dir ? undefined : changes[entry.path];
            const type = entry.dir ? null : fileType(entry.name);
            if (renaming === entry.path)
              return (
                <NameInput
                  depth={depth}
                  placeholder={entry.name}
                  initial={entry.name}
                  onDone={(name) => void renameTo(entry.path, name)}
                />
              );
            return (
              <button
                type="button"
                class="row tr"
                role="treeitem"
                title={entry.path}
                data-path={entry.path}
                data-dir={entry.dir ? "1" : undefined}
                data-ignored={entry.ignored ? "1" : undefined}
                aria-level={depth + 1}
                aria-expanded={entry.dir ? filtering || open.has(entry.path) : undefined}
                aria-selected={selected === entry.path}
                aria-current={p.activeFile === entry.path ? "true" : undefined}
                style={{ paddingLeft: `${10 + depth * 14}px` }}
                onClick={() => (choose(entry), treeRef.current?.focus())}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSelected(entry.path);
                  setMenu({ x: e.clientX, y: e.clientY, entry });
                }}
              >
                <span class="tw">
                  {entry.dir ? (filtering || open.has(entry.path) ? "▾" : "▸") : ""}
                </span>
                {entry.dir ? (
                  <FileIconView name={entry.name} dir open={filtering || open.has(entry.path)} />
                ) : (
                  // The kind's icon (draft-workbench-v2 REQ-187), its type for screen readers.
                  <span class={`ft ${type ? "" : "plain"}`}>
                    <FileIconView name={entry.name} dir={false} />
                    {type && <span class="sr">{type}</span>}
                  </span>
                )}
                <span class="name">{entry.name}</span>
                {isSpec(entry.path) && (
                  <span class="spec-mark" title={tr("tree.specMark")} data-spec="1" />
                )}
                {letter && (
                  <span class="gl" data-letter={letter}>
                    {letter}
                  </span>
                )}
                {entry.dir && dots.has(entry.path) && <span class="gd" data-dot="1" />}
              </button>
            );
          }}
        />
      </div>
      <div class="legend">
        <span>
          <i class="rdot proven" /> {tr("tree.legend.proven")}
        </span>
        <span>
          <i class="rdot building" /> {tr("tree.legend.building")}
        </span>
        <span>
          <i class="rdot waiting" /> {tr("tree.legend.waiting")}
        </span>
        <span>
          <i class="rdot draft" /> {tr("tree.legend.draft")}
        </span>
      </div>

      {menu && (
        <ContextMenu
          menu={menu}
          tr={tr}
          onClose={() => setMenu(null)}
          onHelp={(action) => (setMenu(null), help(action, menu.entry.path))}
          onPick={(action) => {
            const e = menu.entry;
            setMenu(null);
            const dir = e.dir ? e.path : parentOf(e.path);
            if (action === "open") p.openFile(e.path);
            else if (action === "file-new" || action === "folder-new") {
              if (dir) toggle(dir, true);
              setCreating({ dir, folder: action === "folder-new" });
            } else if (action === "file-rename") setRenaming(e.path);
            else if (action === "file-delete") setConfirm({ path: e.path, permanent: false });
            else if (action === "copy-path") void copy(e.path);
            else if (action === "open-terminal") p.onOpenTerminal(dir);
          }}
        />
      )}
      {confirm && (
        <div class="scrim" onClick={() => setConfirm(null)}>
          <div
            class="help confirm"
            role="dialog"
            aria-label={tr(confirm.permanent ? "tree.confirmForGood" : "tree.confirm", {
              path: confirm.path,
            })}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === "Escape" && setConfirm(null)}
          >
            <h2>
              {tr(confirm.permanent ? "tree.confirmForGood" : "tree.confirm", {
                path: confirm.path,
              })}
            </h2>
            <p class="muted">{tr(confirm.permanent ? "tree.cannotUndo" : "tree.toTrash")}</p>
            <div class="actions">
              <button
                type="button"
                class={`btn pri ${confirm.permanent ? "danger" : ""}`}
                data-act="confirm"
                ref={(el) => el?.focus()}
                onClick={() => void remove(confirm.path, confirm.permanent)}
              >
                {tr(confirm.permanent ? "tree.deleteForGood" : "tree.moveToTrash")}
              </button>
              <button type="button" class="btn" onClick={() => setConfirm(null)}>
                {tr("close.cancel")}
              </button>
              <HelpButton
                label={tr("tree.helpOf", { action: tr("tree.file-delete") })}
                onOpen={() =>
                  help(confirm.permanent ? "file-delete-permanent" : "file-delete", confirm.path)
                }
              />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

/** The name of a new or renamed file, typed in its row: Enter saves, Escape cancels (A11). */
function NameInput(props: {
  depth: number;
  placeholder: string;
  initial: string;
  onDone: (name: string) => void;
}) {
  const finished = useRef(false);
  const end = (name: string) => {
    if (finished.current) return;
    finished.current = true;
    props.onDone(name.trim());
  };
  return (
    <div class="tr naming" style={{ paddingLeft: `${10 + props.depth * 14}px` }}>
      <input
        class="filter"
        data-testid="tree-name"
        defaultValue={props.initial}
        placeholder={props.placeholder}
        ref={(el) => {
          if (el && document.activeElement !== el) {
            el.focus();
            const dot = props.initial.lastIndexOf(".");
            el.setSelectionRange(0, dot > 0 ? dot : props.initial.length);
          }
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") end((e.target as HTMLInputElement).value);
          else if (e.key === "Escape") end("");
        }}
        onBlur={(e) =>
          end(
            (e.target as HTMLInputElement).value === props.initial
              ? ""
              : (e.target as HTMLInputElement).value,
          )
        }
      />
    </div>
  );
}

const MENU_FILE = ["open", "file-rename", "file-delete", "copy-path", "open-terminal"] as const;
const MENU_FOLDER = [
  "file-new",
  "folder-new",
  "file-rename",
  "file-delete",
  "copy-path",
  "open-terminal",
] as const;
type MenuAction = (typeof MENU_FILE)[number] | (typeof MENU_FOLDER)[number];

/** The menu of a row (REQ-166, A12): each action with its "?" (REQ-168). */
function ContextMenu(props: {
  menu: NonNullable<Menu>;
  tr: ExplorerProps["tr"];
  onClose: () => void;
  onPick: (a: MenuAction) => void;
  onHelp: (a: ActionId) => void;
}) {
  const items: readonly MenuAction[] = props.menu.entry.dir ? MENU_FOLDER : MENU_FILE;
  useEffect(() => {
    const away = (e: Event) => {
      if (!(e.target as Element | null)?.closest?.(".ctx")) props.onClose();
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && props.onClose();
    window.addEventListener("mousedown", away, true);
    window.addEventListener("keydown", esc, true);
    return () => {
      window.removeEventListener("mousedown", away, true);
      window.removeEventListener("keydown", esc, true);
    };
  }, []);
  return (
    <div
      class="ctx"
      role="menu"
      aria-label={props.menu.entry.path}
      style={{
        left: `${Math.min(props.menu.x, window.innerWidth - 240)}px`,
        top: `${Math.min(props.menu.y, window.innerHeight - 230)}px`,
      }}
    >
      {items.map((a) => (
        <div class="ctx-row" key={a}>
          <button type="button" role="menuitem" data-act={a} onClick={() => props.onPick(a)}>
            {props.tr(`tree.${a}`)}
          </button>
          {a !== "open" && (
            <HelpButton
              label={props.tr("tree.helpOf", { action: props.tr(`tree.${a}`) })}
              onOpen={() => props.onHelp(a)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
