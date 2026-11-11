import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import type { ComponentType, JSX } from "preact";
import type { EditorPaneProps, LensAction } from "./EditorPane.js";
import type { TerminalPaneProps } from "./TerminalPane.js";
import type {
  Annotations,
  CommandEvent,
  Finding,
  Lang as NoticeLang,
  Notice,
  Question,
  QuestionsSection,
  Requests,
  RunResult,
  SectionData,
  SpecgateCommand,
  WorkspaceState,
} from "@specgate-studio/protocol";
import { Rpc } from "./rpc.js";
import { t, type Lang } from "./i18n.js";
import { shortcut, type Action } from "./keys.js";
import { FEATURES, filterFeatures, type Feature } from "./palette.js";
import { closeTab, nextTab, openTab, previousTab, type Tabs } from "./tabs.js";
import { BOTTOM_VIEWS, PANEL_TABS, TOP_VIEWS, type PanelTab, type ViewId } from "./views.js";
import { Logo, ViewIcon } from "./icons.js";
import { VirtualList } from "./VirtualList.js";
import { HelpButton, HelpDialog, NoticeToast, type HelpRequest } from "./Help.js";
import { Changes } from "./views/Changes.js";
import { Build } from "./views/Build.js";
import { Live } from "./views/Live.js";
import { loadSettings, saveSettings, type Theme } from "./settings.js";
import Questions from "./views/Questions.js";
import { AdoptedAreas, SetupNext, SetupPane, type SetupStep } from "./Setup.js";
import { Problems } from "./views/Problems.js";
import { Brief } from "./views/Brief.js";
import { bt } from "./views/briefText.js";

type Sections = Partial<
  Record<"home" | "changes" | "questions" | "matrix" | "report", SectionData>
>;
type Gate = "notRun" | "running" | "passed" | "failed";

interface Requirement {
  id: string;
  title: string | null;
  needs: string | null;
  /** `WAITING_FOR_ANSWER` while a question blocks it (specgate status). */
  category?: string;
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
  const [ended, setEnded] = useState<Record<NoticeLang, Notice> | null>(null);
  const [help, setHelp] = useState<{ title: string; requests: HelpRequest[] } | null>(null);
  // The editor (draft-editor): Monaco loads with the first file, not before (REQ-041).
  const [EditorPane, setEditorPane] = useState<ComponentType<EditorPaneProps> | null>(null);
  const editorApi = useRef<{
    value: (path: string) => string | null;
    discard: (path: string) => void;
  } | null>(null);
  const [unsaved, setUnsaved] = useState<Record<string, true>>({});
  const [annotations, setAnnotations] = useState<Record<string, Annotations>>({});
  const [ask, setAsk] = useState<{ req: string; change: string } | null>(null);
  const [closing, setClosing] = useState<string | null>(null);
  const [buildReq, setBuildReq] = useState<string | null>(null);
  const [traceFilter, setTraceFilter] = useState("");
  const annotateTimer = useRef<number | undefined>(undefined);
  const activeRef = useRef<string | null>(null);
  const annotateRef = useRef<(path: string) => Promise<unknown>>(async () => undefined);
  const [lost, setLost] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  // Setting up a folder that is no project yet (draft-project-setup).
  const [setup, setSetup] = useState<SetupStep | null>(null);
  const [areas, setAreas] = useState<Requests["setup.areas"]["result"] | null>(null);
  // What the brief's last check found (draft-brief REQ-072).
  const [problems, setProblems] = useState<Finding[]>([]);
  // The terminals (draft-terminal): xterm.js loads after the first paint.
  const [TerminalPane, setTerminalPane] = useState<ComponentType<TerminalPaneProps> | null>(null);
  const [echo, setEcho] = useState("");
  const [showStudio, setShowStudio] = useState(0);
  const [openShell, setOpenShell] = useState(0);
  /** The button whose command runs next: the echo names it (REQ-053). */
  const pendingLabel = useRef<string | null>(null);
  /** The button whose agent runs, one module after another: the echo names it for each (draft-brief). */
  const draftLabel = useRef<string | null>(null);
  const [briefRead, setBriefRead] = useState(0);
  const filterRef = useRef<HTMLInputElement>(null);
  const tr = useCallback(
    (key: string, vars?: Record<string, string | number>) => t(lang, key, vars),
    [lang],
  );
  const lensLabels = useMemo(
    () => ({
      build: t(lang, "lens.build"),
      check: t(lang, "lens.check"),
      trace: t(lang, "lens.trace"),
      ask: t(lang, "lens.ask"),
      help: "?",
      answer: t(lang, "question.answer"),
      other: t(lang, "question.other"),
      options: t(lang, "question.options"),
    }),
    [lang],
  );

  // Before the next paint, so the whole workbench turns at once (REQ-034).
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = lang;
    saveSettings({ lang, theme });
  }, [lang, theme]);

  const openProject = useCallback(
    () =>
      rpc.ask("project.open", {}).then(
        (opened) => {
          setProject(opened.project);
          setSections(opened.sections as Sections);
        },
        // A folder that is no project yet has nothing to read: Home offers its setup.
        () =>
          rpc.ask("workspace.get", {}).then(
            (w) => w.kind === "specgate" && setLost(true),
            () => setLost(true),
          ),
      ),
    [rpc],
  );

  // The project, read once (core-host REQ-002); a change of language or theme reads nothing.
  useEffect(() => {
    void openProject();
    rpc.ask("files.list", {}).then(setFiles, () => undefined);
    // The open folder: its branch, team and ticket (draft-workspace), kept current.
    rpc.ask("workspace.get", {}).then(setWorkspace, () => undefined);
    const offWorkspace = rpc.on("workspace.changed", ({ state }) => setWorkspace(state));
    // The brief's checks on every save: Problems, and the open file's underlines (REQ-072).
    rpc.ask("problems.get", {}).then(setProblems, () => undefined);
    const offProblems = rpc.on("problems.changed", ({ findings }) => {
      setProblems(findings);
      if (activeRef.current) void annotateRef.current(activeRef.current);
    });
    const offState = rpc.on("state.changed", ({ sections: changed }) => {
      // The open file's findings and questions may have changed with them (REQ-044).
      if (activeRef.current) void annotateRef.current(activeRef.current);
      for (const s of changed) {
        rpc
          .ask("section.get", { section: s })
          .then((data) => setSections((old) => ({ ...old, [s]: data })));
      }
    });
    const offCommand = rpc.on("command.event", (e: CommandEvent) => {
      if (e.type === "started") {
        setOutput((o) => `${o}$ ${e.command}\n`);
        const label =
          pendingLabel.current ??
          (draftLabel.current && / --agent /.test(e.command) ? draftLabel.current : e.command);
        pendingLabel.current = null;
        setEcho((t) => `${t}\u25b6 "${label}" \u00b7 ${e.command}\n`);
        if (e.command === "specgate check") setGate("running");
      } else if (e.type === "output") {
        setOutput((o) => o + e.chunk);
        setEcho((t) => t + e.chunk);
      } else {
        setOutput((o) => `${o}exit ${e.exitCode}\n`);
        setEcho((t) => `${t}exit ${e.exitCode}\n\n`);
        if (e.notice) setEnded(e.notice);
        setGate((g) => (g === "running" ? (e.exitCode === 0 ? "passed" : "failed") : g));
      }
    });
    return () => {
      offWorkspace();
      offProblems();
      offState();
      offCommand();
    };
  }, [rpc]);

  // A folder created or adopted here is read once it is a project (draft-project-setup).
  const kind = workspace?.kind;
  const wasProject = useRef<boolean | null>(null);
  useEffect(() => {
    if (!kind) return;
    if (wasProject.current === false && kind === "specgate") {
      void openProject();
      rpc.ask("files.list", {}).then(setFiles, () => undefined);
    }
    wasProject.current = kind === "specgate";
  }, [kind, rpc, openProject]);

  useEffect(() => {
    if (lost) setNotice(t(lang, "error.host"));
  }, [lost, lang]);

  const show = useCallback((v: ViewId) => {
    performance.mark(`view:${v}`);
    setView(v);
    setTicketPanel(false);
    setTabs((tb) => ({ ...tb, active: null }));
  }, []);

  const annotate = useCallback(
    (path: string, text?: string) =>
      rpc
        .ask("file.annotations", text === undefined ? { path } : { path, text })
        .then((a) => setAnnotations((old) => ({ ...old, [path]: a })))
        .catch(() => undefined),
    [rpc],
  );

  annotateRef.current = annotate;
  activeRef.current = tabs.active;

  const openFile = useCallback(
    (path: string) => {
      setTabs((tb) => openTab(tb, path));
      if (!EditorPane) {
        void import("./EditorPane.js").then((m) => setEditorPane(() => m.default));
      }
      void annotate(path);
      if (texts[path] === undefined) {
        rpc
          .ask("file.read", { path })
          .then(({ text }) => setTexts((old) => ({ ...old, [path]: text })));
      }
    },
    [rpc, texts, EditorPane, annotate],
  );

  const save = useCallback(
    async (path: string) => {
      const text = editorApi.current?.value(path);
      if (text == null) return;
      await rpc.ask("file.write", { path, text });
      setTexts((old) => ({ ...old, [path]: text }));
      setUnsaved(({ [path]: _, ...rest }) => rest);
      setNotice(t(lang, "editor.saved", { path }));
      void annotate(path);
    },
    [rpc, lang, annotate],
  );

  const close = useCallback(
    (path: string) => (unsaved[path] ? setClosing(path) : setTabs((tb) => closeTab(tb, path))),
    [unsaved],
  );

  /** Names the button whose command runs next, in the terminal's echo (REQ-053). */
  const announce = useCallback((label: string) => {
    pendingLabel.current = label;
    setPanel({ open: true, tab: "terminal" });
    setShowStudio((n) => n + 1);
  }, []);

  /** Runs a studio command for a button, which the terminal's echo names (REQ-053). */
  const runCommand = useCallback(
    (label: string, command: SpecgateCommand): Promise<RunResult> => {
      announce(label);
      return rpc.ask("command.run", command);
    },
    [rpc, announce],
  );

  /**
   * "Draft the modules" (draft-brief REQ-073): the host drafts each module in
   * turn; the echo names the button for each, and the end says what happened.
   */
  const draftModules = useCallback(
    async (label: string) => {
      announce(label);
      const mine = draftLabel.current === null;
      if (mine) draftLabel.current = label;
      try {
        const r = await rpc.ask("brief.draft", {});
        // Refused or nothing to draft: no run consumed the button's name.
        if (!r.ok || r.drafted.length === 0) pendingLabel.current = null;
        if (r.notice) setEnded(r.notice);
        else if (!r.ok) setNotice(r.message);
      } catch (e) {
        pendingLabel.current = null;
        setNotice(e instanceof Error ? e.message : String(e));
      } finally {
        if (mine) {
          draftLabel.current = null;
          setBriefRead((n) => n + 1);
        }
      }
    },
    [rpc, announce],
  );

  const runFeature = useCallback(
    (f: Feature, label?: string) => {
      setPalette(null);
      const r = f.run;
      if (r.kind === "view") {
        show(r.view);
        if (r.panel === "fromTicket") setTicketPanel(true);
      } else if (r.kind === "check") {
        void runCommand(label ?? f.title[lang], { name: "check" });
      } else if (r.kind === "language") setLang((l) => (l === "en" ? "es" : "en"));
      else if (r.kind === "theme") setTheme((th) => (th === "dark" ? "light" : "dark"));
      else if (r.kind === "togglePanel") setPanel((p) => ({ ...p, open: !p.open }));
      else setSidebar((s) => !s);
    },
    [rpc, show, runCommand, lang],
  );

  const act = useCallback(
    (a: Action) => {
      switch (a) {
        case "palette":
          return setPalette("features");
        case "openFile":
          return setPalette("files");
        case "save":
          return tabs.active ? void save(tabs.active) : setNotice(tr("editor.nothing"));
        case "closeTab":
          return tabs.active ? close(tabs.active) : undefined;
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
    [show, tr, tabs.active, save, close],
  );

  // Before the first paint: a key pressed the moment the workbench shows is not lost.
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && palette) {
        setPalette(null);
        return;
      }
      const a = shortcut(e, isMac);
      if (!a) return;
      // Inside the editor, find is the editor's own (Monaco's find widget).
      const inEditor = (e.target as Element | null)?.closest?.(".monaco-editor");
      if (a === "find" && inEditor) return;
      // The workbench's shortcut wins over the editor's (Monaco keeps F1 and Cmd+P for itself).
      e.preventDefault();
      e.stopPropagation();
      act(a);
    };
    window.addEventListener("keydown", onKey, true);
    document.body.dataset.ready = "1";
    return () => window.removeEventListener("keydown", onKey, true);
  }, [act, palette]);

  useEffect(() => {
    performance.mark("workbench:interactive");
    // The terminals' code after the workbench is usable, never in its way (ADR-0002).
    const t = window.setTimeout(
      () => void import("./TerminalPane.js").then((m) => setTerminalPane(() => m.default)),
      50,
    );
    return () => window.clearTimeout(t);
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
  // Just adopted, REQ-001 alone: the areas it found and the next step (REQ-115).
  useEffect(() => {
    if (kind !== "specgate" || !home || total > 1) return setAreas(null);
    rpc.ask("setup.areas", {}).then(setAreas, () => setAreas(null));
  }, [rpc, kind, home, total]);
  const requirements = home?.requirements ?? [];
  const changes =
    (sections.changes as { changes?: Array<{ id: string }> } | undefined)?.changes ?? [];
  const questionsSection = sections.questions as QuestionsSection | undefined;
  const questions = questionsSection?.questions?.open ?? [];
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
                {unsaved[p] && (
                  <span class="dirty" aria-label={tr("editor.unsaved")}>
                    ●
                  </span>
                )}
                <span class="x" aria-label="×" onClick={(e) => (e.stopPropagation(), close(p))}>
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
              EditorPane && texts[activeFile] !== undefined ? (
                <EditorPane
                  path={activeFile}
                  text={texts[activeFile]!}
                  theme={theme}
                  annotations={annotations[activeFile] ?? null}
                  labels={lensLabels}
                  commands={LENS_COMMANDS}
                  register={(api) => (editorApi.current = api)}
                  onEdit={(path, value) => {
                    setUnsaved((u) => {
                      if (value !== texts[path]) return { ...u, [path]: true };
                      const { [path]: _, ...rest } = u;
                      return rest;
                    });
                    window.clearTimeout(annotateTimer.current);
                    annotateTimer.current = window.setTimeout(
                      () => void annotate(path, value),
                      300,
                    );
                  }}
                  onLens={(action: LensAction, req: string) => {
                    const change = annotations[activeFile]?.change ?? null;
                    if (action === "check")
                      runFeature(
                        FEATURES.find((f) => f.id === "gate.check")!,
                        lensLabels.check,
                      );
                    else if (action === "build") (setBuildReq(req), show("build"));
                    else if (action === "trace") (setTraceFilter(req), show("traceability"));
                    else if (action === "ask") {
                      if (change) setAsk({ req, change });
                      else setNotice(tr("ask.noChange"));
                    } else
                      setHelp({
                        title: tr("help.title", { feature: req }),
                        requests: [
                          { action: "build", feature: lensLabels.build, vars: { req } },
                          { action: "check", feature: lensLabels.check, vars: { req } },
                          ...(change
                            ? [
                                {
                                  action: "ask-change" as const,
                                  feature: lensLabels.ask,
                                  vars: { req, change, module: change.replace(/^draft-/, "") },
                                },
                              ]
                            : []),
                        ],
                      });
                  }}
                  onAnswer={(q, answer) =>
                    void runCommand(lensLabels.answer, {
                      name: "answer",
                      q: q.id,
                      answer,
                      change: q.change,
                    })
                  }
                />
              ) : (
                <pre class="file">{texts[activeFile] ?? ""}</pre>
              )
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
                rpc={rpc}
                folder={workspace?.name ?? ""}
                kind={kind ?? null}
                setup={setup}
                openSetup={setSetup}
                closeSetup={() => setSetup(null)}
                areas={areas}
                run={runCommand}
                announce={announce}
                requirements={requirements}
                changes={changes}
                questionsSection={questionsSection}
                onAnswer={(q, answer) =>
                  void runCommand(tr("question.answer"), {
                    name: "answer",
                    q: q.id,
                    answer,
                    change: q.change,
                  })
                }
                onReviewed={(q) =>
                  void runCommand(tr("questions.specSaysIt"), {
                    name: "answer-reviewed",
                    q: q.id,
                    change: q.change,
                  })
                }
                files={files}
                openFile={openFile}
                filterRef={filterRef}
                ticketPanel={ticketPanel}
                changesView={
                  <Changes
                    rpc={rpc}
                    lang={lang}
                    ticketPanel={ticketPanel}
                    stamp={[sections.changes, sections.home]}
                    run={(label, command) => runCommand(label, command)}
                    onHelp={(feature, requests) =>
                      setHelp({ title: tr("help.title", { feature }), requests })
                    }
                  />
                }
                briefView={
                  <Brief
                    rpc={rpc}
                    lang={lang}
                    stamp={[sections.home, sections.changes, briefRead]}
                    openFile={openFile}
                    onDraft={(label) => void draftModules(label)}
                    onHelp={(feature, requests) =>
                      setHelp({ title: tr("help.title", { feature }), requests })
                    }
                  />
                }
                reportTotal={(sections.report as { total?: number } | undefined)?.total}
                onCheck={() =>
                  runFeature(
                    FEATURES.find((f) => f.id === "gate.check")!,
                    tr("home.check"),
                  )
                }
                onHelp={(r: HelpRequest) =>
                  setHelp({ title: tr("help.title", { feature: r.feature }), requests: [r] })
                }
                buildView={
                  <Build
                    rpc={rpc}
                    lang={lang}
                    stamp={[sections.home, sections.changes, sections.questions]}
                    focus={buildReq}
                    onHelp={(feature, requests) =>
                      setHelp({ title: tr("help.title", { feature }), requests })
                    }
                    announce={announce}
                    onLive={() => show("live")}
                  />
                }
                liveView={
                  <Live
                    rpc={rpc}
                    lang={lang}
                    run={runCommand}
                    onHelp={(feature, requests) =>
                      setHelp({ title: tr("help.title", { feature }), requests })
                    }
                    announce={announce}
                  />
                }
                traceFilter={traceFilter}
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
              {p === "problems" && problems.length > 0 && ` (${problems.length})`}
            </button>
          ))}
        </div>
        <div class={`pbody mono ${panel.tab === "terminal" ? "flush" : ""}`} data-panel={panel.tab}>
          {TerminalPane && (
            <div class="term-wrap" style={{ display: panel.tab === "terminal" ? "flex" : "none" }}>
              <TerminalPane
                rpc={rpc}
                theme={theme}
                visible={panel.open && panel.tab === "terminal"}
                echo={echo}
                showStudio={showStudio}
                openShell={openShell}
                labels={{
                  newTerminal: tr("term.new"),
                  close: tr("term.close"),
                  readonly: tr("term.readonly"),
                  openTerminal: tr("term.open"),
                }}
              />
            </div>
          )}
          {panel.tab === "terminal" ? (
            !TerminalPane && tr("panel.empty")
          ) : panel.tab === "gate" ? (
            <pre style="margin:0;white-space:pre-wrap">{output || tr("panel.empty")}</pre>
          ) : panel.tab === "problems" ? (
            <Problems
              lang={lang}
              findings={problems}
              onOpen={openFile}
              onHelp={() =>
                setHelp({
                  title: tr("help.title", { feature: bt(lang, "problems.feature") }),
                  requests: [{ action: "brief-check", feature: bt(lang, "problems.feature") }],
                })
              }
            />
          ) : (
            tr("panel.empty")
          )}
        </div>
      </section>

      <footer class="status" data-testid="status-bar">
        <span data-testid="status-branch">⎇ {workspace?.git?.branch ?? tr("status.noBranch")}</span>
        <span data-testid="status-ticket">
          {workspace?.git?.ticket
            ? [workspace.git.ticket, workspace.git.team].filter(Boolean).join(" · ")
            : tr("status.noTicket")}
        </span>
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
          onHelp={(f) => {
            setPalette(null);
            setHelp({
              title: tr("help.title", { feature: f.title[lang] }),
              requests: [{ action: f.action!, feature: f.title[lang] }],
            });
          }}
        />
      )}
      {help && (
        <HelpDialog
          rpc={rpc}
          lang={lang}
          requests={help.requests}
          title={help.title}
          closeLabel={tr("help.close")}
          onClose={() => setHelp(null)}
        />
      )}
      {ended && (
        <NoticeToast
          notice={ended[lang]}
          nextLabel={tr("notice.next")}
          fixLabel={tr("notice.fix")}
          onClose={() => setEnded(null)}
        />
      )}
      {ask && (
        <AskDialog
          tr={tr}
          req={ask.req}
          change={ask.change}
          onCancel={() => setAsk(null)}
          onSend={(text) => {
            setAsk(null);
            void runCommand(lensLabels.ask, {
              name: "change-note",
              change: ask.change,
              text,
              req: ask.req,
            });
          }}
        />
      )}
      {closing && (
        <div class="scrim">
          <div
            class="help"
            role="dialog"
            aria-label={tr("close.title", { file: closing.split("/").pop()! })}
          >
            <h2>{tr("close.title", { file: closing.split("/").pop()! })}</h2>
            <div class="actions">
              <button
                type="button"
                class="btn pri"
                onClick={() => {
                  const path = closing;
                  setClosing(null);
                  void save(path).then(() => setTabs((tb) => closeTab(tb, path)));
                }}
              >
                {tr("close.save")}
              </button>
              <button
                type="button"
                class="btn"
                onClick={() => {
                  const path = closing;
                  setClosing(null);
                  editorApi.current?.discard(path);
                  setUnsaved(({ [path]: _, ...rest }) => rest);
                  setTabs((tb) => closeTab(tb, path));
                }}
              >
                {tr("close.discard")}
              </button>
              <button type="button" class="btn" onClick={() => setClosing(null)}>
                {tr("close.cancel")}
              </button>
            </div>
          </div>
        </div>
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
  rpc: Rpc;
  folder: string;
  kind: WorkspaceState["kind"] | null;
  setup: SetupStep | null;
  openSetup: (step: SetupStep) => void;
  closeSetup: () => void;
  areas: Requests["setup.areas"]["result"] | null;
  run: (label: string, command: SpecgateCommand) => Promise<RunResult>;
  announce: (label: string) => void;
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
  questionsSection: QuestionsSection | undefined;
  onAnswer: (q: Question, answer: string) => void;
  onReviewed: (q: Question) => void;
  files: string[];
  openFile: (p: string) => void;
  filterRef: { current: HTMLInputElement | null };
  ticketPanel: boolean;
  /** The Changes view (draft-changes). */
  changesView: JSX.Element;
  /** The Brief view (draft-brief). */
  briefView: JSX.Element;
  reportTotal: number | undefined;
  onCheck: () => void;
  onHelp: (r: HelpRequest) => void;
  /** Build and Live (draft-build-live). */
  buildView: JSX.Element;
  liveView: JSX.Element;
  traceFilter: string;
}

function View(p: ViewProps) {
  const [filter, setFilter] = useState("");
  const title = <h1>{p.tr(`view.${p.view}`)}</h1>;
  switch (p.view) {
    case "home": {
      if (p.setup) {
        return (
          <SetupPane
            rpc={p.rpc}
            tr={p.tr}
            step={p.setup}
            run={p.run}
            announce={p.announce}
            onHelp={p.onHelp}
            onDone={p.closeSetup}
          />
        );
      }
      // A folder that is no project yet: its setup is the next step (REQ-116).
      const step = p.kind === "empty" ? "create" : p.kind === "code" ? "adopt" : null;
      if (step) {
        return (
          <>
            <h1>{p.folder || p.tr("view.home")}</h1>
            <SetupNext tr={p.tr} step={step} onOpen={() => p.openSetup(step)} />
          </>
        );
      }
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
          {p.areas?.adopted ? (
            <AdoptedAreas tr={p.tr} byKind={p.areas.byKind} areas={p.areas.areas} />
          ) : (
            p.next && (
              <div class="next">
                <div class="k">[ {p.tr("home.next").toUpperCase()} ]</div>
                <div class="mono" style="margin-top:6px">
                  {p.next}
                </div>
              </div>
            )
          )}
          <div class="actions">
            <button type="button" class="btn pri" onClick={p.onCheck}>
              {p.tr("home.check")}
            </button>
            <HelpButton
              label={p.tr("help.button", { feature: p.tr("home.check") })}
              onOpen={() =>
                p.onHelp({
                  action: "check",
                  feature: p.tr("home.check"),
                  vars: (() => {
                    const req = /\bREQ-\d+\b/.exec(p.next ?? "")?.[0];
                    return req ? { req } : {};
                  })(),
                })
              }
            />
          </div>
        </>
      );
    }
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
          {p.changesView}
        </>
      );
    case "brief":
      return p.briefView;
    case "questions":
      return (
        <Questions
          section={p.questionsSection}
          waiting={
            new Set(
              p.requirements.filter((r) => r.category === "WAITING_FOR_ANSWER").map((r) => r.id),
            )
          }
          tr={p.tr}
          onAnswer={p.onAnswer}
          onReviewed={p.onReviewed}
          onHelp={p.onHelp}
        />
      );
    case "build":
      return (
        <>
          {title}
          {p.buildView}
        </>
      );
    case "live":
      return (
        <>
          {title}
          {p.liveView}
        </>
      );
    case "traceability": {
      // Trace from the editor: the requirement's own row first (REQ-042).
      const rows = p.traceFilter
        ? p.requirements.filter((r) => r.id === p.traceFilter)
        : p.requirements;
      return (
        <div style="display:flex;flex-direction:column;height:100%">
          <h2 style="margin:0;padding:12px" class="muted" data-filter={p.traceFilter}>
            {p.tr("traceability.rows", { n: rows.length })}
          </h2>
          <div style="flex:1;min-height:0" data-testid="traceability-list">
            <VirtualList
              count={rows.length}
              row={(i) => {
                const r = rows[i]!;
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
    }
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
  onHelp: (f: Feature) => void;
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
          help: f.action ? () => props.onHelp(f) : null,
        }))
      : props.files
          .filter((f) => f.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 50)
          .map((f) => ({
            key: f,
            title: f,
            command: null as string | null,
            pick: () => props.onFile(f),
            help: null as null | (() => void),
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
              {it.help && (
                <HelpButton
                  label={props.tr("help.button").replace("{feature}", it.title)}
                  onOpen={it.help}
                />
              )}
            </li>
          ))}
        </ul>
        {items.length === 0 && <div class="none">{props.tr("palette.none")}</div>}
      </div>
    </div>
  );
}

/** The specgate command each action above a requirement runs (REQ-042). */
const LENS_COMMANDS: EditorPaneProps["commands"] = {
  build: (req) => `specgate harness run --req ${req}`,
  check: () => "specgate check",
  trace: () => "specgate matrix",
  ask: (req) => `specgate change note <change> "<request>" --req ${req}`,
};

/** Ask for a change: the Reviewer's words, sent with `specgate change note` (help REQ-064). */
function AskDialog(props: {
  tr: (k: string, v?: Record<string, string | number>) => string;
  req: string;
  change: string;
  onCancel: () => void;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  return (
    <div class="scrim" onClick={props.onCancel}>
      <div
        class="help"
        role="dialog"
        aria-label={props.tr("ask.title", { req: props.req })}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{props.tr("ask.title", { req: props.req })}</h2>
        <p class="muted">{props.tr("ask.body", { change: props.change })}</p>
        <textarea
          class="ask"
          value={text}
          onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
          aria-label={props.tr("ask.title", { req: props.req })}
        />
        <div class="actions">
          <button
            type="button"
            class="btn pri"
            disabled={!text.trim()}
            onClick={() => props.onSend(text.trim())}
          >
            {props.tr("ask.send")}
          </button>
          <button type="button" class="btn" onClick={props.onCancel}>
            {props.tr("close.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
