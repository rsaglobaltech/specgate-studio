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
  Unreadable,
  SectionData,
  SpecgateCommand,
  WorkspaceState,
} from "@specgate-studio/protocol";
import { Rpc } from "./rpc.js";
import { t, type Lang } from "./i18n.js";
import { shortcut, type Action } from "./keys.js";
import { AREAS, FEATURES, MENUS, filterFeatures, type Feature } from "./palette.js";
import {
  closeTab,
  closeTabs,
  nextTab,
  openTab,
  previousTab,
  renameTab,
  type Tabs,
} from "./tabs.js";
import { BOTTOM_VIEWS, PANEL_TABS, TOP_VIEWS, type PanelTab, type ViewId } from "./views.js";
import { Logo, ViewIcon } from "./icons.js";
import { VirtualList } from "./VirtualList.js";
import { HelpButton, HelpDialog, NoticeToast, type HelpRequest } from "./Help.js";
import { Changes } from "./views/Changes.js";
import { Build } from "./views/Build.js";
import { Live } from "./views/Live.js";
import { loadSettings, saveSettings, type Theme } from "./settings.js";
import Questions from "./views/Questions.js";
import { AdoptedAreas, NewProject, SetupNext, SetupPane, type SetupStep } from "./Setup.js";
import { Problems } from "./views/Problems.js";
import { Brief } from "./views/Brief.js";
import { bt } from "./views/briefText.js";
import { Explorer } from "./Explorer.js";
import { Home } from "./views/Home.js";
import { HelpView } from "./views/HelpView.js";
import { fileType, modulesOf } from "./tree.js";

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
  /** What the main area shows while the Explorer's panel is the open view (draft-explorer-tree A7). */
  const [behind, setBehind] = useState<ViewId>("home");
  /** A line to bring into view in the editor: a requirement opened from the Explorer (REQ-169). */
  const [reveal, setReveal] = useState<{ path: string; line: number; n: number } | null>(null);
  /** The requirement the studio is building, for the modules' dots (REQ-169). */
  const [building, setBuilding] = useState<string | null>(null);
  /** The drafts no person approved yet (REQ-169). */
  const [unapproved, setUnapproved] = useState<ReadonlySet<string>>(new Set());
  const [focusEditor, setFocusEditor] = useState(0);
  /** The tabs opened on a requirement: their id and title (REQ-177, A16). */
  const [tabReq, setTabReq] = useState<Record<string, { id: string; title: string }>>({});
  /** Where the cursor is, for the breadcrumb (REQ-177). */
  const [cursor, setCursor] = useState<{ path: string; line: number } | null>(null);
  const [openShellIn, setOpenShellIn] = useState<{ n: number; cwd: string } | null>(null);
  const [ticketPanel, setTicketPanel] = useState(false);
  const [tabs, setTabs] = useState<Tabs>({ open: [], active: null });
  const [texts, setTexts] = useState<Record<string, string>>({});
  // Always there (draft-workbench-v2 REQ-184): Ctrl/Cmd+J folds it to its tabs and back,
  // never removes it; `open` is whether its body shows.
  const [panel, setPanel] = useState<{ open: boolean; tab: PanelTab }>({
    open: true,
    tab: "terminal",
  });
  /** The shell new terminals run and their folder, beside "+" (REQ-184). */
  const [shell, setShell] = useState<{ name: string; folder: string } | null>(null);
  useEffect(() => {
    void rpc.ask("terminal.shell", {}).then(setShell, () => undefined);
  }, [rpc]);
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
  const closeHelp = useCallback(() => setHelp(null), []);
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
  /** The host gone for over a second: a banner and a grey status bar (REQ-178, A17). */
  const [offline, setOffline] = useState(false);
  /** The sections that could not be read, and why (REQ-178, A18). */
  const [unreadable, setUnreadable] = useState<Partial<Record<string, Unreadable>>>({});
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
      traceCount: (scenarios: number, tests: number) =>
        t(lang, "lens.traceCount", {
          scenarios: t(lang, scenarios === 1 ? "lens.scenario" : "lens.scenarios", {
            n: scenarios,
          }),
          tests: t(lang, tests === 1 ? "lens.test" : "lens.tests", { n: tests }),
        }),
      qOpen: (q: string, req: string) => t(lang, "question.open", { q, req }),
      qSource: (change: string) => t(lang, "question.source", { change }),
      qFoot: (q: string) => t(lang, "question.foot", { q }),
      qHelp: t(lang, "question.help"),
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
          setUnreadable(opened.unreadable ?? {});
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
    // A terminal of the Developer's still open (a reload, a second tab): the panel holds it.
    rpc.ask("terminal.list", {}).then(
      (open) => open.length > 0 && setPanel((p) => ({ ...p, open: true })),
      () => undefined,
    );
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

  // The requirement being built and the drafts to review: the Explorer's dots (REQ-169).
  useEffect(() => {
    rpc.ask("live.get", {}).then(
      (l) => setBuilding(l.building),
      () => undefined,
    );
    return rpc.on("live.changed", (l) => setBuilding(l.building));
  }, [rpc]);
  // The drafts to review come with what Home and the Explorer read (REQ-169, REQ-173).
  const onReview = useCallback(
    (ids: readonly string[]) =>
      setUnapproved((old) =>
        old.size === ids.length && ids.every((i) => old.has(i)) ? old : new Set(ids),
      ),
    [],
  );
  const refreshFiles = useCallback(
    () => void rpc.ask("files.list", {}).then(setFiles, () => undefined),
    [rpc],
  );

  // The host lost and back (REQ-178, A17): said after 1 s; once back, what is open is read again.
  useEffect(() => {
    let timer: number | undefined;
    return rpc.onStatus((c) => {
      window.clearTimeout(timer);
      if (c === "lost") timer = window.setTimeout(() => setOffline(true), 1000);
      else {
        setOffline(false);
        void openProject();
        rpc.ask("files.list", {}).then(setFiles, () => undefined);
        rpc.ask("workspace.get", {}).then(setWorkspace, () => undefined);
      }
    });
  }, [rpc, openProject]);

  // A folder created or adopted here is read once it is a project (draft-project-setup).
  const kind = workspace?.kind;
  const wasProject = useRef<boolean | null>(null);
  // A folder that was a project when opened shows its shape while it is read (REQ-178);
  // one being created or adopted keeps its setup on screen instead.
  const firstKind = useRef<string | null>(null);
  if (kind && firstKind.current === null) firstKind.current = kind;
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
    // The Explorer is a side panel: what was in the main area stays (A7).
    if (v === "explorer") {
      setView((old) => {
        if (old !== "explorer") setBehind(old);
        return "explorer";
      });
      return;
    }
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
    (path: string, line?: number, req?: { id: string; title: string }) => {
      if (line) setReveal((r) => ({ path, line, n: (r?.n ?? 0) + 1 }));
      // A tab opened on a requirement shows its id and title (REQ-177, A16).
      if (req) setTabReq((t) => ({ ...t, [path]: req }));
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

  /** The last command a button ran: a failed one can be run again (REQ-178, A19). */
  const lastRun = useRef<{ label: string; command: SpecgateCommand } | null>(null);
  /** Runs a studio command for a button, which the terminal's echo names (REQ-053). */
  const runCommand = useCallback(
    (label: string, command: SpecgateCommand): Promise<RunResult> => {
      lastRun.current = { label, command };
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
      else if (r.kind === "openFile") setPalette("files");
      else if (r.kind === "palette") setPalette("features");
      else if (r.kind === "newTerminal") {
        setPanel({ open: true, tab: "terminal" });
        setOpenShell((n) => n + 1);
      } else setSidebar((s) => !s);
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
  // How many tests name each requirement, as `report --json` says: Trace's count (REQ-171).
  const testsOf = useMemo(() => {
    const tested = new Map<string, number>();
    const rows = (sections.report as { requirements?: unknown[] } | undefined)?.requirements ?? [];
    for (const r of rows as Array<{ requirement?: unknown; testExists?: unknown }>)
      if (typeof r.requirement === "string")
        tested.set(r.requirement, r.testExists === true ? 1 : 0);
    return (req: string) => tested.get(req) ?? 0;
  }, [sections.report]);
  const titles = useMemo(
    () => new Map(requirements.map((r) => [r.id, r.title ?? ""])),
    [requirements],
  );
  const questionsByChange = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of questions) m.set(q.change, (m.get(q.change) ?? 0) + 1);
    return m;
  }, [questions]);
  const badge: Partial<Record<ViewId, number>> = {
    changes: changes.length,
    questions: questions.length,
  };
  const activeFile = tabs.active;
  // The requirement under the cursor ends the breadcrumb (REQ-177, A16).
  const crumbReq = (() => {
    if (!activeFile) return null;
    const heads = annotations[activeFile]?.headings ?? [];
    const line =
      cursor?.path === activeFile ? cursor.line : reveal?.path === activeFile ? reveal.line : 1;
    let at: string | null = null;
    for (const h of heads) if (h.line <= line) at = h.req;
    return at;
  })();
  /** What the main area shows: the Explorer is a side panel beside it (A7). */
  const mainView: ViewId = view === "explorer" ? behind : view;
  const mainSection = SECTION_OF[mainView] ?? null;
  const readAgain = (section: string) =>
    rpc.ask("section.get", { section: section as never }).then(
      (data) => {
        setSections((old) => ({ ...old, [section]: data }));
        setUnreadable(({ [section]: _, ...rest }) => rest);
      },
      (e: Error) => setUnreadable((u) => ({ ...u, [section]: { message: e.message } })),
    );
  // What the open view counts, in the status bar (REQ-172, A7).
  const answered = questionsSection?.questions?.answered ?? [];
  const viewStatus =
    !activeFile && mainView === "questions"
      ? tr("status.questions", { open: questions.length, confirm: answered.length })
      : null;

  return (
    <div class={`wb ${offline ? "offline" : ""}`}>
      {offline && (
        <div class="banner" role="status" data-testid="reconnecting">
          <span class="spin" />
          <b>{tr("offline.title")}</b> {tr("offline.body")}
        </div>
      )}
      <header class="top">
        <span class="brand">
          <Logo />
          specgate<b>studio</b>
        </span>
        {/* The menu bar: in the page in the browser; the desktop app's is the system's (REQ-172). */}
        {!DESKTOP && <MenuBar lang={lang} onFeature={(f) => runFeature(f)} />}
        <button type="button" class="search" onClick={() => setPalette("features")}>
          <span>{tr("palette.search", { project: project || "…" })}</span>
          <span class="mono">{isMac ? "⌘ ⇧ P" : "Ctrl ⇧ P"}</span>
        </button>
        <span class="top-end">
          <span class={`pill ${gate}`} data-testid="gate-pill">
            <span class="dot" />
            {tr(`pill.${gate}`)}
          </span>
          <button
            type="button"
            class="btn pri build"
            data-testid="header-build"
            onClick={() => show("build")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 4l13 8-13 8z" />
            </svg>
            {tr("view.build")}
          </button>
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

        {(view === "explorer" || sidebar) && (
          <Explorer
            rpc={rpc}
            lang={lang}
            tr={tr}
            files={files}
            requirements={requirements}
            changes={changes}
            questions={questionsSection}
            report={sections.report}
            unapproved={unapproved}
            onReview={onReview}
            building={building}
            activeFile={activeFile}
            activeReq={crumbReq}
            project={project}
            workspaceStamp={workspace}
            filterRef={filterRef}
            openFile={openFile}
            onHelp={(title, requests) => setHelp({ title, requests })}
            onNotice={setEnded}
            onOpenTerminal={(cwd) => {
              setPanel({ open: true, tab: "terminal" });
              setOpenShellIn((o) => ({ n: (o?.n ?? 0) + 1, cwd }));
              setEnded({
                en: {
                  tone: "ok",
                  ran: t("en", "tree.terminalOpened", { path: cwd || "." }),
                  wrote: t("en", "tree.copiedWrote"),
                  next: t("en", "tree.terminalNext"),
                },
                es: {
                  tone: "ok",
                  ran: t("es", "tree.terminalOpened", { path: cwd || "." }),
                  wrote: t("es", "tree.copiedWrote"),
                  next: t("es", "tree.terminalNext"),
                },
              });
            }}
            onRenamed={(from, to) => {
              setTabs((tb) => renameTab(tb, from, to));
              setTexts((old) => {
                const next: Record<string, string> = {};
                for (const [k, v] of Object.entries(old))
                  next[k === from || k.startsWith(`${from}/`) ? to + k.slice(from.length) : k] = v;
                return next;
              });
            }}
            onDeleted={(path) =>
              setTabs((tb) => closeTabs(tb, (p) => p === path || p.startsWith(`${path}/`)))
            }
            onFilesChanged={refreshFiles}
          />
        )}

        <section class="main">
          {tabs.open.length > 0 && (
            <div class="tabs" role="tablist" aria-label={tr("explorer.files")}>
              {tabs.open.map((p) => (
                <button
                  type="button"
                  role="tab"
                  class="tab"
                  key={p}
                  aria-selected={p === activeFile}
                  title={p}
                  data-type={tabReq[p] ? "REQ" : (fileType(p.split("/").pop()!) ?? "·")}
                  onClick={() => setTabs((tb) => ({ ...tb, active: p }))}
                >
                  {tabReq[p] ? `${tabReq[p]!.id} · ${tabReq[p]!.title}` : p.split("/").pop()}
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
          )}
          <div
            class={`content ${activeFile || SPLIT_VIEWS.has(mainView) ? "flush" : ""}`}
            data-view={activeFile ? "file" : mainView}
          >
            {activeFile && (
              <nav class="crumbs" aria-label={tr("crumbs.label")} data-testid="breadcrumb">
                {[
                  ...activeFile.split("/").slice(0, -1),
                  ...(crumbReq ? [crumbReq] : [activeFile.split("/").pop()!]),
                ].map((part, i, all) => (
                  <span key={i} class={i === all.length - 1 ? "here" : ""}>
                    {part}
                  </span>
                ))}
              </nav>
            )}
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
                  reveal={reveal}
                  focus={focusEditor}
                  testsOf={testsOf}
                  onQuestionHelp={(q) =>
                    setHelp({
                      title: tr("help.title", { feature: lensLabels.answer }),
                      requests: [
                        {
                          action: "answer",
                          feature: lensLabels.answer,
                          vars: { q: q.id, change: q.change },
                        },
                      ],
                    })
                  }
                  onCursor={(path, line) => setCursor({ path, line })}
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
            ) : mainSection && unreadable[mainSection] ? (
              <CouldNotRead
                tr={tr}
                view={tr(`view.${mainView}`)}
                why={unreadable[mainSection]!}
                onAgain={() => void readAgain(mainSection)}
                onOpen={(file, line) => openFile(file, line)}
              />
            ) : !project && firstKind.current === "specgate" ? (
              <Skeleton tr={tr} />
            ) : (
              <View
                view={mainView}
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
                root={workspace?.root ?? ""}
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
                homeView={
                  <Home
                    rpc={rpc}
                    tr={tr}
                    project={project}
                    branch={workspace?.git?.branch ?? null}
                    requirements={requirements}
                    total={total}
                    done={done}
                    report={sections.report}
                    stamp={[sections.home, sections.changes, sections.questions]}
                    unapproved={unapproved}
                    onReview={onReview}
                    questionsByChange={questionsByChange}
                    next={home?.nextCommand ?? null}
                    show={show}
                    onCheck={() =>
                      runFeature(
                        FEATURES.find((f) => f.id === "gate.check")!,
                        tr("home.check"),
                      )
                    }
                    onDoctor={() => void runCommand(tr("home.doctor"), { name: "doctor" })}
                    checking={gate === "running"}
                    onFromTicket={() => (show("changes"), setTicketPanel(true))}
                    onOpenTerminal={() => {
                      setPanel({ open: true, tab: "terminal" });
                      setOpenShell((n) => n + 1);
                    }}
                    onHelp={(r) =>
                      setHelp({ title: tr("help.title", { feature: r.feature }), requests: [r] })
                    }
                  />
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
                    modules={modulesOf(requirements, sections.report, { building, unapproved })}
                    titles={titles}
                  />
                }
                traceFilter={traceFilter}
              />
            )}
          </div>
        </section>
      </div>

      <section
        class="panel"
        data-collapsed={panel.open ? undefined : "1"}
        aria-label={lang === "es" ? "Panel inferior" : "Bottom panel"}
      >
        <div class="ptabs-bar">
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
                data-tab={p}
                key={p}
                aria-selected={panel.tab === p}
                onClick={() => setPanel({ open: true, tab: p })}
              >
                {tr(`panel.${p}`)}
                {p === "problems" && problems.length > 0 && ` (${problems.length})`}
              </button>
            ))}
          </div>
          <span class="pend">
            {shell && (
              <span class="pshell mono" data-testid="panel-shell" title={shell.folder}>
                {shell.name} · {shell.folder}
              </span>
            )}
            <button
              type="button"
              class="pnew"
              data-testid="panel-new"
              aria-label={tr("term.new")}
              title={tr("term.new")}
              onClick={() => {
                setPanel({ open: true, tab: "terminal" });
                setOpenShell((n) => n + 1);
              }}
            >
              +
            </button>
          </span>
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
                openShellIn={openShellIn}
                labels={{
                  newTerminal: tr("term.new"),
                  close: tr("term.close"),
                  readonly: tr("term.readonly"),
                  openTerminal: tr("term.open"),
                  empty: tr("term.empty", { project: project || workspace?.name || "" }),
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

      <footer class="status" data-testid="status-bar" data-offline={offline ? "1" : undefined}>
        {offline && <span data-testid="status-offline">{tr("offline.status")}</span>}
        <span data-testid="status-branch">⎇ {workspace?.git?.branch ?? tr("status.noBranch")}</span>
        <span data-testid="status-ticket">
          {workspace?.git?.ticket
            ? [workspace.git.ticket, workspace.git.team].filter(Boolean).join(" · ")
            : tr("status.noTicket")}
        </span>
        <span data-testid="status-gate">{tr(`status.gate.${gate}`)}</span>
        <span data-testid="status-progress">{tr("status.progress", { done, total })}</span>
        {viewStatus && <span data-testid="status-view">{viewStatus}</span>}
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
          rpc={rpc}
          files={files}
          onClose={() => setPalette(null)}
          onFeature={runFeature}
          onFile={(p) => (setPalette(null), openFile(p), setFocusEditor((n) => n + 1))}
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
          eyebrow={tr("help.eyebrow")}
          onClose={closeHelp}
        />
      )}
      {ended && (
        <NoticeToast
          notice={ended[lang]}
          nextLabel={tr("notice.next")}
          fixLabel={tr("notice.fix")}
          retryLabel={tr("notice.retry")}
          closeLabel={tr("help.close")}
          onRetry={
            lastRun.current
              ? () => {
                  const r = lastRun.current!;
                  setEnded(null);
                  void runCommand(r.label, r.command);
                }
              : undefined
          }
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

interface ViewProps {
  view: ViewId;
  rpc: Rpc;
  folder: string;
  /** The open folder's path: not one of its own recent projects (REQ-174). */
  root: string;
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
  /** Home as the boards draw it (draft-design-conformance REQ-173). */
  homeView: JSX.Element;
  /** Build and Live (draft-build-live). */
  buildView: JSX.Element;
  liveView: JSX.Element;
  traceFilter: string;
}

function View(p: ViewProps) {
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
      // An empty folder's Home: the five questions at once (draft-design-conformance REQ-174).
      if (p.kind === "empty")
        return (
          <NewProject
            root={p.root}
            rpc={p.rpc}
            tr={p.tr}
            step="create"
            run={p.run}
            announce={p.announce}
            onHelp={p.onHelp}
            onDone={p.closeSetup}
            onCreated={() => p.openSetup("created")}
          />
        );
      const step = p.kind === "code" ? "adopt" : null;
      if (step) {
        return (
          <>
            <h1>{p.folder || p.tr("view.home")}</h1>
            <SetupNext tr={p.tr} step={step} onOpen={() => p.openSetup(step)} />
          </>
        );
      }
      // Just adopted: the areas it found and what is next (REQ-115).
      if (p.areas?.adopted)
        return (
          <>
            <h1>{p.project || p.tr("view.home")}</h1>
            <div class="cards">
              <div class="card">
                <div class="k">{p.tr("home.requirements")}</div>
                <div class="v">{p.total}</div>
              </div>
            </div>
            <AdoptedAreas tr={p.tr} byKind={p.areas.byKind} areas={p.areas.areas} />
          </>
        );
      return p.homeView;
    }
    case "changes":
      return p.changesView;
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
      return p.buildView;
    case "live":
      return p.liveView;
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
            {/* The same count as Home: `report --json`'s total leaves out open changes. */}
            <div class="v" data-testid="report-total">
              {p.total}
            </div>
            {p.reportTotal !== undefined && (
              <div class="muted" data-testid="report-split">
                {p.tr("report.split", {
                  spec: String(p.reportTotal),
                  changes: String(Math.max(0, p.total - p.reportTotal)),
                })}
              </div>
            )}
          </div>
        </>
      );
    case "help":
      return <HelpView rpc={p.rpc} lang={p.lang} tr={p.tr} />;
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
  rpc: Rpc;
  files: string[];
  onClose: () => void;
  onFeature: (f: Feature) => void;
  onFile: (p: string) => void;
  onHelp: (f: Feature) => void;
}) {
  const [query, setQuery] = useState("");
  const [at, setAt] = useState(0);
  type Item = {
    key: string;
    title: string;
    command: string | null;
    area: string | null;
    feature: Feature | null;
    pick: () => void;
    help: null | (() => void);
  };
  const found =
    props.mode === "features" ? filterFeatures(FEATURES, query, props.lang) : ([] as Feature[]);
  // By area, as the boards group them (draft-design-conformance REQ-176, A15).
  const items: Item[] =
    props.mode === "features"
      ? AREAS.flatMap((area) =>
          found
            .filter((f) => f.area === area)
            .map((f) => ({
              key: f.id,
              title: f.title[props.lang],
              command: f.command,
              area,
              feature: f,
              pick: () => props.onFeature(f),
              help: f.action ? () => props.onHelp(f) : null,
            })),
        )
      : props.files
          .filter((f) => f.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 50)
          .map((f) => ({
            key: f,
            title: f,
            command: null,
            area: null,
            feature: null,
            pick: () => props.onFile(f),
            help: null,
          }));
  const chosen = items[at] ?? null;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown")
      (e.preventDefault(), setAt((i) => Math.min(i + 1, items.length - 1)));
    else if (e.key === "ArrowUp") (e.preventDefault(), setAt((i) => Math.max(i - 1, 0)));
    else if (e.key === "Enter") (e.preventDefault(), items[at]?.pick());
    else if (e.key === "Escape") props.onClose();
    else if (e.key === "?" && chosen?.help && query.trim() === "")
      (e.preventDefault(), chosen.help());
  };
  const row = (it: Item, i: number) => (
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
  );
  let index = 0;
  return (
    <div class="scrim" onClick={props.onClose}>
      <div
        class={`palette ${props.mode === "features" ? "with-pane" : ""}`}
        role="dialog"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="pinput">
          <span class="prompt">›</span>
          <input
            autoFocus
            ref={(el) => el?.focus()}
            value={query}
            placeholder={props.tr("palette.placeholder")}
            onInput={(e) => (setQuery((e.target as HTMLInputElement).value), setAt(0))}
            onKeyDown={onKey}
            aria-label={props.tr("palette.placeholder")}
          />
          <span class="kbd">Esc</span>
        </div>
        <div class="pbody-wrap">
          <div class="plist">
            {props.mode === "features" ? (
              AREAS.map((area) => {
                const these = items.filter((it) => it.area === area);
                if (these.length === 0) return null;
                return (
                  <div class="parea" key={area} data-area={area}>
                    <div class="pgroup">{props.tr(`palette.area.${area}`)}</div>
                    <ul role="listbox">{these.map((it) => row(it, index++))}</ul>
                  </div>
                );
              })
            ) : (
              <ul role="listbox">{items.map((it, i) => row(it, i))}</ul>
            )}
            {items.length === 0 && <div class="none">{props.tr("palette.none")}</div>}
          </div>
          {props.mode === "features" && (
            <PalettePane
              rpc={props.rpc}
              lang={props.lang}
              tr={props.tr}
              feature={chosen?.feature ?? null}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** The chosen feature's "?" beside the list, under "[ UNDER THE HOOD ]" (REQ-176, A15). */
function PalettePane(props: {
  rpc: Rpc;
  lang: Lang;
  tr: (k: string) => string;
  feature: Feature | null;
}) {
  const f = props.feature;
  const [answer, setAnswer] = useState<Requests["help.explain"]["result"] | null>(null);
  // Asked once the choice settles: typing through the list asks nothing.
  useEffect(() => {
    let live = true;
    setAnswer(null);
    const action = f?.action;
    const timer = window.setTimeout(() => {
      if (action)
        props.rpc.ask("help.explain", { action, lang: props.lang, vars: {} }).then(
          (a) => live && setAnswer(a),
          () => undefined,
        );
    }, 150);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [f?.id, props.lang]);
  return (
    <aside class="ppane" data-testid="palette-pane" data-feature={f?.id ?? ""}>
      <div class="eyebrow mono">[ {props.tr("help.eyebrow")} ]</div>
      {f && <h2 class="syne">{f.title[props.lang]}</h2>}
      {f && !f.action && (
        <p class="muted">{f.command ? f.command : props.tr("palette.noCommand")}</p>
      )}
      {answer && (
        <dl>
          {(["does", "command", "files", "doesNot", "next"] as const).map((part) => (
            <div key={part} data-part={part}>
              <dt>{answer.labels[part]}</dt>
              <dd class={part === "command" ? "mono" : ""}>{answer.explanation[part]}</dd>
            </div>
          ))}
        </dl>
      )}
      <div class="pfoot">
        <span>
          <span class="kbd">↑↓</span> {props.tr("palette.choose")}
        </span>
        <span>
          <span class="kbd">Enter</span> {props.tr("palette.run")}
        </span>
        <span>
          <span class="kbd">?</span> {props.tr("palette.explain")}
        </span>
      </div>
    </aside>
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

/** The views drawn as a side panel beside their detail, edge to edge (REQ-175). */
const SPLIT_VIEWS = new Set<ViewId>(["traceability", "changes", "questions", "build", "live"]);

/** The desktop app: the operating system draws the menu (REQ-172, A5). */
const DESKTOP =
  typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);
if (typeof window !== "undefined")
  (window as unknown as { __studio?: Record<string, unknown> }).__studio = {
    ...((window as unknown as { __studio?: Record<string, unknown> }).__studio ?? {}),
    menus: MENUS,
  };

/** The menu bar in the page (REQ-172, A5): each menu's entries are the palette's features. */
function MenuBar(props: { lang: Lang; onFeature: (f: Feature) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (!(e.target as Element | null)?.closest?.(".menubar")) setOpen(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("mousedown", away, true);
    window.addEventListener("keydown", esc, true);
    return () => {
      window.removeEventListener("mousedown", away, true);
      window.removeEventListener("keydown", esc, true);
    };
  }, [open]);
  return (
    <nav class="menubar" aria-label={props.lang === "es" ? "Menú" : "Menu"}>
      {MENUS.map((m) => (
        <div class="menu" key={m.id}>
          <button
            type="button"
            data-menu={m.id}
            aria-expanded={open === m.id}
            onClick={() => setOpen((o) => (o === m.id ? null : m.id))}
            onMouseEnter={() => open && setOpen(m.id)}
          >
            {m.title[props.lang]}
          </button>
          {open === m.id && (
            <div class="menu-list" role="menu">
              {m.items.map((id) => {
                const f = FEATURES.find((x) => x.id === id);
                if (!f) return null;
                return (
                  <button
                    type="button"
                    role="menuitem"
                    key={id}
                    data-feature={id}
                    onClick={() => {
                      setOpen(null);
                      props.onFeature(f);
                    }}
                  >
                    <span>{f.title[props.lang]}</span>
                    {f.command && <span class="mono">{f.command}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}

/** The section each view is made of (REQ-178). */
const SECTION_OF: Partial<Record<ViewId, string>> = {
  home: "home",
  changes: "changes",
  questions: "questions",
  traceability: "matrix",
  report: "report",
};

/** A section being read: its shape, never a blank page — after 150 ms (REQ-178, A18). */
function Skeleton(props: { tr: (k: string) => string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), 150);
    return () => window.clearTimeout(t);
  }, []);
  if (!shown) return null;
  return (
    <section class="card skeleton" data-testid="loading" aria-busy="true">
      <div class="eyebrow mono">[ {props.tr("state.loading")} ]</div>
      <p class="muted">{props.tr("state.loadingBody")}</p>
      <div class="bar-s" style={{ width: "40%" }} />
      <div class="bar-s" style={{ width: "92%" }} />
      <div class="bar-s" style={{ width: "76%" }} />
      <div class="bar-s" style={{ width: "84%" }} />
    </section>
  );
}

/** A section that cannot be read: its file and line, and to read it again (REQ-178, A18). */
function CouldNotRead(props: {
  tr: (k: string, v?: Record<string, string | number>) => string;
  view: string;
  why: Unreadable;
  onAgain: () => void;
  onOpen: (file: string, line?: number) => void;
}) {
  const { why } = props;
  return (
    <section class="card unreadable" data-testid="unreadable" role="alert">
      <div class="eyebrow mono">[ {props.tr("state.unreadable")} ]</div>
      <p>
        <b>{props.tr("state.unreadableTitle", { view: props.view })}</b>{" "}
        {why.file && <span class="mono">{why.file.split("/").pop()}</span>}
        {why.line ? ` · ${props.tr("state.line", { n: why.line })}` : ""}
      </p>
      <p class="muted">{why.message}</p>
      <p class="muted">{props.tr("state.restWorks")}</p>
      <div class="actions">
        <button type="button" class="btn" data-act="read-again" onClick={props.onAgain}>
          {props.tr("state.readAgain")}
        </button>
        {why.file && (
          <button
            type="button"
            class="btn"
            data-act="open-line"
            onClick={() => props.onOpen(why.file!, why.line)}
          >
            {why.line ? props.tr("state.openLine", { n: why.line }) : props.tr("state.openFile")}
          </button>
        )}
      </div>
    </section>
  );
}
