import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import type { CommandEvent, SectionData } from "@specgate-studio/protocol";
import { Rpc } from "./rpc.js";
import { t, type Lang } from "./i18n.js";
import { shortcut, type Action } from "./keys.js";
import { FEATURES, filterFeatures, type Feature } from "./palette.js";
import { closeTab, nextTab, openTab, previousTab, type Tabs } from "./tabs.js";
import { BOTTOM_VIEWS, PANEL_TABS, TOP_VIEWS, type PanelTab, type ViewId } from "./views.js";
import { Logo, ViewIcon } from "./icons.js";
import { VirtualList } from "./VirtualList.js";
import { loadSettings, saveSettings, type Theme } from "./settings.js";

type Sections = Partial<
  Record<"home" | "changes" | "questions" | "matrix" | "report", SectionData>
>;
type Gate = "notRun" | "running" | "passed" | "failed";

interface Requirement {
  id: string;
  title: string | null;
  needs: string | null;
}

const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/**
 * The workbench (draft-workbench): the activity bar on every screen
 * (REQ-031), tabs, the bottom panel and the status bar (REQ-032), the command
 * palette (REQ-033), two languages and two themes (REQ-034). It renders what
 * the host answers; it decides nothing about the project.
 */
export function App({ rpc }: { rpc: Rpc }) {
  const initial = useMemo(() => loadSettings(), []);
  const [lang, setLang] = useState<Lang>(initial.lang);
  const [theme, setTheme] = useState<Theme>(initial.theme);
  const [view, setView] = useState<ViewId>("home");
  const [ticketPanel, setTicketPanel] = useState(false);
  const [tabs, setTabs] = useState<Tabs>({ open: [], active: null });
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [panel, setPanel] = useState<{ open: boolean; tab: PanelTab }>({
    open: true,
    tab: "terminal",
  });
  const [sidebar, setSidebar] = useState(false);
  const [palette, setPalette] = useState<null | "features" | "files">(null);
  const [project, setProject] = useState<string>("");
  const [sections, setSections] = useState<Sections>({});
  const [files, setFiles] = useState<string[]>([]);
  const [gate, setGate] = useState<Gate>("notRun");
  const [output, setOutput] = useState<string>("");
  const [notice, setNotice] = useState<string | null>(null);
  const [lost, setLost] = useState(false);
  const filterRef = useRef<HTMLInputElement>(null);
  const tr = useCallback(
    (key: string, vars?: Record<string, string | number>) => t(lang, key, vars),
    [lang],
  );

  // Before the next paint, so the whole workbench turns at once (REQ-034).
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = lang;
    saveSettings({ lang, theme });
  }, [lang, theme]);

  // The project, read once (core-host REQ-002); a change of language or theme reads nothing.
  useEffect(() => {
    rpc.ask("project.open", {}).then(
      (opened) => {
        setProject(opened.project);
        setSections(opened.sections as Sections);
      },
      () => setLost(true),
    );
    rpc.ask("files.list", {}).then(setFiles, () => undefined);
    const offState = rpc.on("state.changed", ({ sections: changed }) => {
      for (const s of changed) {
        rpc
          .ask("section.get", { section: s })
          .then((data) => setSections((old) => ({ ...old, [s]: data })));
      }
    });
    const offCommand = rpc.on("command.event", (e: CommandEvent) => {
      if (e.type === "started") {
        setOutput((o) => `${o}$ ${e.command}\n`);
        if (e.command === "specgate check") setGate("running");
      } else if (e.type === "output") setOutput((o) => o + e.chunk);
      else {
        setOutput((o) => `${o}exit ${e.exitCode}\n`);
        setGate((g) => (g === "running" ? (e.exitCode === 0 ? "passed" : "failed") : g));
      }
    });
    return () => {
      offState();
      offCommand();
    };
  }, [rpc]);

  useEffect(() => {
    if (lost) setNotice(t(lang, "error.host"));
  }, [lost, lang]);

  const show = useCallback((v: ViewId) => {
    performance.mark(`view:${v}`);
    setView(v);
    setTicketPanel(false);
    setTabs((tb) => ({ ...tb, active: null }));
  }, []);

  const openFile = useCallback(
    (path: string) => {
      setTabs((tb) => openTab(tb, path));
      if (texts[path] === undefined) {
        rpc
          .ask("file.read", { path })
          .then(({ text }) => setTexts((old) => ({ ...old, [path]: text })));
      }
    },
    [rpc, texts],
  );

  const runFeature = useCallback(
    (f: Feature) => {
      setPalette(null);
      const r = f.run;
      if (r.kind === "view") {
        show(r.view);
        if (r.panel === "fromTicket") setTicketPanel(true);
      } else if (r.kind === "check") {
        setPanel({ open: true, tab: "gate" });
        void rpc.ask("command.run", { name: "check" });
      } else if (r.kind === "language") setLang((l) => (l === "en" ? "es" : "en"));
      else if (r.kind === "theme") setTheme((th) => (th === "dark" ? "light" : "dark"));
      else if (r.kind === "togglePanel") setPanel((p) => ({ ...p, open: !p.open }));
      else setSidebar((s) => !s);
    },
    [rpc, show],
  );

  const act = useCallback(
    (a: Action) => {
      switch (a) {
        case "palette":
          return setPalette("features");
        case "openFile":
          return setPalette("files");
        case "save":
          return setNotice(tr("panel.empty"));
        case "closeTab":
          return setTabs((tb) => (tb.active ? closeTab(tb, tb.active) : tb));
        case "nextTab":
          return setTabs(nextTab);
        case "previousTab":
          return setTabs(previousTab);
        case "toggleSidebar":
          return setSidebar((s) => !s);
        case "togglePanel":
          return setPanel((p) => ({ ...p, open: !p.open }));
        case "terminal":
          return setPanel({ open: true, tab: "terminal" });
        case "explorer":
          return show("explorer");
        case "find":
        case "search":
          if (a === "search") show("explorer");
          return setTimeout(() => filterRef.current?.focus(), 0);
        case "settings":
          return show("settings");
      }
    },
    [show, tr],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && palette) {
        setPalette(null);
        return;
      }
      const a = shortcut(e, isMac);
      if (!a) return;
      e.preventDefault();
      act(a);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [act, palette]);

  useEffect(() => {
    performance.mark("workbench:interactive");
  }, []);

  const home = sections.home as
    | {
        total?: number;
        pending?: number;
        requirements?: Requirement[];
        nextCommand?: string | null;
      }
    | undefined;
  const total = home?.total ?? 0;
  const done = total - (home?.pending ?? 0);
  const requirements = home?.requirements ?? [];
  const changes =
    (sections.changes as { changes?: Array<{ id: string }> } | undefined)?.changes ?? [];
  const questions =
    (
      sections.questions as
        | {
            questions?: {
              open?: Array<{ id: string; text: string; blocks: string[]; change: string }>;
            };
          }
        | undefined
    )?.questions?.open ?? [];
  const badge: Partial<Record<ViewId, number>> = {
    changes: changes.length,
    questions: questions.length,
  };
  const activeFile = tabs.active;

  return (
    <div class="wb">
      <header class="top">
        <span class="brand">
          <Logo />
          specgate<b>studio</b>
        </span>
        <button type="button" class="search" onClick={() => setPalette("features")}>
          <span>{tr("palette.search", { project: project || "…" })}</span>
          <span class="mono">{isMac ? "⌘ ⇧ P" : "Ctrl ⇧ P"}</span>
        </button>
        <span class={`pill ${gate}`} data-testid="gate-pill">
          <span class="dot" />
          {tr(`status.gate.${gate}`)}
        </span>
      </header>

      <div class="middle">
        <nav class="activity" aria-label={lang === "es" ? "Vistas" : "Views"}>
          {TOP_VIEWS.map((v) => (
            <ActivityButton
              key={v}
              view={v}
              current={view === v && !activeFile}
              label={tr(`view.${v}`)}
              badge={badge[v]}
              onClick={() => show(v)}
            />
          ))}
          <div class="grow" />
          {BOTTOM_VIEWS.map((v) => (
            <ActivityButton
              key={v}
              view={v}
              current={view === v && !activeFile}
              label={tr(`view.${v}`)}
              onClick={() => show(v)}
            />
          ))}
        </nav>

        {sidebar && (
          <aside class="side" aria-label={tr("explorer.files")}>
            <h2>{tr("view.explorer")}</h2>
            <FileList files={files} onOpen={openFile} empty={tr("explorer.empty")} />
          </aside>
        )}

        <section class="main">
          <div class="tabs" role="tablist" aria-label={tr("explorer.files")}>
            {tabs.open.map((p) => (
              <button
                type="button"
                role="tab"
                class="tab"
                key={p}
                aria-selected={p === activeFile}
                title={p}
                onClick={() => setTabs((tb) => ({ ...tb, active: p }))}
              >
                {p.split("/").pop()}
                <span
                  class="x"
                  aria-label="×"
                  onClick={(e) => (e.stopPropagation(), setTabs((tb) => closeTab(tb, p)))}
                >
                  ×
                </span>
              </button>
            ))}
          </div>
          <div
            class={`content ${activeFile || view === "explorer" || view === "traceability" ? "flush" : ""}`}
            data-view={activeFile ? "file" : view}
          >
            {activeFile ? (
              <pre class="file">{texts[activeFile] ?? ""}</pre>
            ) : (
              <View
                view={view}
                tr={tr}
                lang={lang}
                theme={theme}
                setLang={setLang}
                setTheme={setTheme}
                project={project}
                total={total}
                done={done}
                next={home?.nextCommand ?? null}
                requirements={requirements}
                changes={changes}
                questions={questions}
                files={files}
                openFile={openFile}
                filterRef={filterRef}
                ticketPanel={ticketPanel}
                reportTotal={(sections.report as { total?: number } | undefined)?.total}
              />
            )}
          </div>
        </section>
      </div>

      <section class="panel" hidden={!panel.open} aria-label="Panel">
        <div
          class="ptabs"
          role="tablist"
          aria-label={lang === "es" ? "Panel inferior" : "Bottom panel"}
        >
          {PANEL_TABS.map((p) => (
            <button
              type="button"
              role="tab"
              class="ptab"
              key={p}
              aria-selected={panel.tab === p}
              onClick={() => setPanel({ open: true, tab: p })}
            >
              {tr(`panel.${p}`)}
            </button>
          ))}
        </div>
        <div class="pbody mono" data-panel={panel.tab}>
          {panel.tab === "gate" || panel.tab === "terminal" ? (
            <pre style="margin:0;white-space:pre-wrap">{output || tr("panel.empty")}</pre>
          ) : (
            tr("panel.empty")
          )}
        </div>
      </section>

      <footer class="status" data-testid="status-bar">
        <span data-testid="status-branch">⎇ {tr("status.noBranch")}</span>
        <span data-testid="status-ticket">{tr("status.noTicket")}</span>
        <span data-testid="status-gate">{tr(`status.gate.${gate}`)}</span>
        <span data-testid="status-progress">{tr("status.progress", { done, total })}</span>
        <span class="end" data-testid="status-cost">
          {tr("status.cost")} $0.00
        </span>
        <span>{lang.toUpperCase()}</span>
      </footer>

      {palette && (
        <Palette
          mode={palette}
          lang={lang}
          tr={tr}
          files={files}
          onClose={() => setPalette(null)}
          onFeature={runFeature}
          onFile={(p) => (setPalette(null), openFile(p))}
        />
      )}
      {notice && (
        <div class="notice" role="status" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}
    </div>
  );
}

function ActivityButton(props: {
  view: ViewId;
  current: boolean;
  label: string;
  badge?: number | undefined;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      class="sga"
      data-view={props.view}
      aria-label={props.label}
      title={props.label}
      aria-current={props.current ? "page" : undefined}
      onClick={props.onClick}
    >
      <ViewIcon view={props.view} />
      {props.badge ? <span class="sgb">{props.badge}</span> : null}
    </button>
  );
}

function FileList(props: {
  files: string[];
  onOpen: (p: string) => void;
  empty: string;
  filter?: string;
}) {
  const shown = props.filter
    ? props.files.filter((f) => f.toLowerCase().includes(props.filter!.toLowerCase()))
    : props.files;
  if (shown.length === 0)
    return (
      <p class="muted" style="padding:0 12px">
        {props.empty}
      </p>
    );
  return (
    <VirtualList
      count={shown.length}
      row={(i) => (
        <button type="button" class="row" onClick={() => props.onOpen(shown[i]!)} title={shown[i]}>
          {shown[i]}
        </button>
      )}
    />
  );
}

interface ViewProps {
  view: ViewId;
  tr: (k: string, v?: Record<string, string | number>) => string;
  lang: Lang;
  theme: Theme;
  setLang: (l: Lang) => void;
  setTheme: (t: Theme) => void;
  project: string;
  total: number;
  done: number;
  next: string | null;
  requirements: Requirement[];
  changes: Array<{ id: string }>;
  questions: Array<{ id: string; text: string; blocks: string[]; change: string }>;
  files: string[];
  openFile: (p: string) => void;
  filterRef: { current: HTMLInputElement | null };
  ticketPanel: boolean;
  reportTotal: number | undefined;
}

function View(p: ViewProps) {
  const [filter, setFilter] = useState("");
  const title = <h1>{p.tr(`view.${p.view}`)}</h1>;
  switch (p.view) {
    case "home":
      return (
        <>
          <h1>{p.project || p.tr("view.home")}</h1>
          <div class="cards">
            <div class="card">
              <div class="k">{p.tr("home.requirements")}</div>
              <div class="v">{p.total}</div>
            </div>
            <div class="card">
              <div class="k">{p.tr("home.done")}</div>
              <div class="v">{p.done}</div>
            </div>
            <div class="card">
              <div class="k">{p.tr("home.pending")}</div>
              <div class="v">{p.total - p.done}</div>
            </div>
          </div>
          {p.next && (
            <div class="next">
              <div class="k">[ {p.tr("home.next").toUpperCase()} ]</div>
              <div class="mono" style="margin-top:6px">
                {p.next}
              </div>
            </div>
          )}
        </>
      );
    case "explorer":
      return (
        <div style="display:flex;flex-direction:column;height:100%">
          <h2
            style="margin:0;padding:12px 12px 8px;font-size:11px;letter-spacing:.08em;text-transform:uppercase"
            class="muted"
          >
            {p.tr("view.explorer")}
          </h2>
          <input
            ref={p.filterRef}
            class="filter"
            value={filter}
            onInput={(e) => setFilter((e.target as HTMLInputElement).value)}
            aria-label={p.tr("explorer.files")}
          />
          <div style="flex:1;min-height:0">
            <FileList
              files={p.files}
              onOpen={p.openFile}
              empty={p.tr("explorer.empty")}
              filter={filter}
            />
          </div>
        </div>
      );
    case "changes":
      return (
        <>
          {title}
          {p.ticketPanel && (
            <section class="card" aria-label={p.tr("ticket.title")} style="margin-bottom:16px">
              <h2 style="margin:0 0 6px;font-size:16px">{p.tr("ticket.title")}</h2>
              <p class="muted" style="margin:0 0 8px">
                {p.tr("ticket.body")}
              </p>
              <span class="mono muted">specgate propose --from-ticket &lt;KEY&gt;</span>
            </section>
          )}
          {p.changes.map((c) => (
            <div class="card" key={c.id} style="margin-bottom:8px">
              {c.id}
            </div>
          ))}
        </>
      );
    case "questions":
      return (
        <>
          {title}
          {p.questions.map((q) => (
            <div class="card" key={`${q.change}/${q.id}`} style="margin-bottom:8px">
              <b>{q.id}</b> <span class="muted">{q.change}</span>
              <div>{q.text}</div>
              <div class="muted mono">{q.blocks.join(", ")}</div>
            </div>
          ))}
        </>
      );
    case "traceability":
      return (
        <div style="display:flex;flex-direction:column;height:100%">
          <h2 style="margin:0;padding:12px" class="muted">
            {p.tr("traceability.rows", { n: p.requirements.length })}
          </h2>
          <div style="flex:1;min-height:0" data-testid="traceability-list">
            <VirtualList
              count={p.requirements.length}
              row={(i) => {
                const r = p.requirements[i]!;
                return (
                  <div class="row">
                    <span class="mono">{r.id}</span>
                    <span>{r.title}</span>
                    <span class="muted" style="margin-left:auto">
                      {r.needs}
                    </span>
                  </div>
                );
              }}
            />
          </div>
        </div>
      );
    case "report":
      return (
        <>
          {title}
          <div class="card">
            <div class="k">{p.tr("home.requirements")}</div>
            <div class="v">{p.reportTotal ?? "—"}</div>
          </div>
        </>
      );
    case "settings":
      return (
        <div class="settings">
          {title}
          <label>
            {p.tr("settings.language")}
            <select
              value={p.lang}
              onChange={(e) => p.setLang((e.target as HTMLSelectElement).value as Lang)}
              aria-label={p.tr("settings.language")}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </label>
          <label>
            {p.tr("settings.theme")}
            <select
              value={p.theme}
              onChange={(e) => p.setTheme((e.target as HTMLSelectElement).value as Theme)}
              aria-label={p.tr("settings.theme")}
            >
              <option value="dark">{p.tr("settings.dark")}</option>
              <option value="light">{p.tr("settings.light")}</option>
            </select>
          </label>
        </div>
      );
    default:
      return (
        <>
          {title}
          <p class="muted">{p.tr("view.soon")}</p>
        </>
      );
  }
}

function Palette(props: {
  mode: "features" | "files";
  lang: Lang;
  tr: (k: string) => string;
  files: string[];
  onClose: () => void;
  onFeature: (f: Feature) => void;
  onFile: (p: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [at, setAt] = useState(0);
  const items =
    props.mode === "features"
      ? filterFeatures(FEATURES, query, props.lang).map((f) => ({
          key: f.id,
          title: f.title[props.lang],
          command: f.command,
          pick: () => props.onFeature(f),
        }))
      : props.files
          .filter((f) => f.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 50)
          .map((f) => ({
            key: f,
            title: f,
            command: null as string | null,
            pick: () => props.onFile(f),
          }));
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown")
      (e.preventDefault(), setAt((i) => Math.min(i + 1, items.length - 1)));
    else if (e.key === "ArrowUp") (e.preventDefault(), setAt((i) => Math.max(i - 1, 0)));
    else if (e.key === "Enter") (e.preventDefault(), items[at]?.pick());
    else if (e.key === "Escape") props.onClose();
  };
  return (
    <div class="scrim" onClick={props.onClose}>
      <div
        class="palette"
        role="dialog"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          ref={(el) => el?.focus()}
          value={query}
          placeholder={props.tr("palette.placeholder")}
          onInput={(e) => (setQuery((e.target as HTMLInputElement).value), setAt(0))}
          onKeyDown={onKey}
          aria-label={props.tr("palette.placeholder")}
        />
        <ul role="listbox">
          {items.map((it, i) => (
            <li
              key={it.key}
              role="option"
              aria-selected={i === at}
              onMouseEnter={() => setAt(i)}
              onClick={it.pick}
            >
              <span>{it.title}</span>
              {it.command && <span class="mono">{it.command}</span>}
            </li>
          ))}
        </ul>
        {items.length === 0 && <div class="none">{props.tr("palette.none")}</div>}
      </div>
    </div>
  );
}
