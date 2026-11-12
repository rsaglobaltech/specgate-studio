import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { Annotations } from "@specgate-studio/protocol";
import { SPEC_LANGUAGE, monaco } from "./monaco.js";

/** The last focus request an editor took: each is taken once (see `focus`). */
let focusTaken = 0;

export type LensAction = "build" | "check" | "trace" | "ask" | "help";

export interface EditorPaneProps {
  path: string;
  /** The file's text as last read or saved. */
  text: string;
  theme: "dark" | "light";
  annotations: Annotations | null;
  labels: Record<LensAction, string> & {
    answer: string;
    other: string;
    options: string;
    /** "(1 scenario, 0 tests)" beside Trace (draft-design-conformance REQ-171). */
    traceCount: (scenarios: number, tests: number) => string;
    /** The inline question's header, source and footnote (REQ-044, as the board draws it). */
    qOpen: (q: string, req: string) => string;
    qSource: (change: string) => string;
    qFoot: (q: string) => string;
    qHelp: string;
  };
  /** How many tests name a requirement, for Trace's count. */
  testsOf?: (req: string) => number;
  /** The "?" of an inline question. */
  onQuestionHelp?: (q: { id: string; change: string }) => void;
  commands: Record<Exclude<LensAction, "help">, (req: string) => string>;
  onEdit: (path: string, value: string) => void;
  onLens: (action: LensAction, req: string) => void;
  onAnswer: (q: { id: string; change: string }, answer: string) => void;
  /** A line to show and put the cursor on, bumped with `n` (a requirement opened, REQ-169). */
  reveal?: { path: string; line: number; n: number } | null;
  /** Bumped when the editor should take the keyboard: a file opened from the palette. */
  focus?: number;
  /** The line the cursor is on, for the breadcrumb and the status bar (REQ-177). */
  onCursor?: (path: string, line: number, column: number) => void;
  register: (api: {
    value: (path: string) => string | null;
    discard: (path: string) => void;
  }) => void;
}

const models = new Map<string, monaco.editor.ITextModel>();
let lensHandler: (action: LensAction, req: string) => void = () => undefined;
let lensData: {
  headings: Annotations["headings"];
  labels: EditorPaneProps["labels"];
  commands: EditorPaneProps["commands"];
  testsOf?: ((req: string) => number) | undefined;
} | null = null;
const lensChanged = new monaco.Emitter<monaco.languages.CodeLensProvider>();
const COMMAND = "studio.lens";
monaco.editor.registerCommand(COMMAND, (_accessor, action: LensAction, req: string) =>
  lensHandler(action, req),
);

/** Build, Check, Trace, Ask for a change and "?" above each requirement (REQ-042). */
const lenses: monaco.languages.CodeLensProvider = {
  onDidChange: lensChanged.event,
  provideCodeLenses: (model) => {
    if (!lensData) return { lenses: [], dispose: () => undefined };
    const { headings, labels, commands } = lensData;
    const lenses: monaco.languages.CodeLens[] = [];
    const lines = model.getLinesContent();
    for (const [i, h] of headings.entries()) {
      // What Trace finds, beside it as the board shows: its scenarios and the tests naming it.
      const end = headings[i + 1]?.line ?? lines.length + 1;
      const scenarios = lines
        .slice(h.line, end - 1)
        .filter((l) => /^#{2,6}\s+Scenario:/.test(l)).length;
      const tests = lensData.testsOf?.(h.req) ?? 0;
      const range = {
        startLineNumber: h.line,
        startColumn: 1,
        endLineNumber: h.line,
        endColumn: 1,
      };
      for (const action of ["build", "check", "trace", "ask", "help"] as const) {
        lenses.push({
          range,
          command: {
            id: COMMAND,
            title: labels[action],
            tooltip: action === "help" ? labels.help : commands[action](h.req),
            arguments: [action, h.req],
          },
        });
        if (action === "trace")
          lenses.push({
            range,
            command: { id: "", title: labels.traceCount(scenarios, tests) },
          });
      }
    }
    return { lenses, dispose: () => undefined };
  },
};
monaco.languages.registerCodeLensProvider("markdown", lenses);
monaco.languages.registerCodeLensProvider(SPEC_LANGUAGE, lenses);

/**
 * The editor: Monaco, one model per open file (REQ-041); the actions above
 * each requirement (REQ-042); the findings underlined with their code,
 * message and fix (REQ-043); each blocking question under its requirement,
 * answered with `specgate answer` (REQ-044). It paints what the host worked
 * out; it writes nothing but through the person's Save (REQ-045).
 */
export default function EditorPane(p: EditorPaneProps) {
  const box = useRef<HTMLDivElement>(null);
  const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const zones = useRef<string[]>([]);
  const widgets = useRef<monaco.editor.IOverlayWidget[]>([]);
  const props = useRef(p);
  props.current = p;

  useEffect(() => {
    const ed = monaco.editor.create(box.current!, {
      automaticLayout: true,
      minimap: { enabled: false },
      wordWrap: "on",
      fontSize: 13,
      lineHeight: 22,
      codeLensFontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      codeLensFontSize: 12,
      fontFamily: "'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace",
      scrollBeyondLastLine: false,
      codeLens: true,
      renderValidationDecorations: "on",
    });
    editor.current = ed;
    ed.onDidChangeCursorPosition((e) => {
      const path = props.current.path;
      props.current.onCursor?.(path, e.position.lineNumber, e.position.column);
    });
    p.register({
      value: (path) => models.get(path)?.getValue() ?? null,
      // Don't save: the edits are dropped; the file is read again when reopened.
      discard: (path) => {
        models.get(path)?.dispose();
        models.delete(path);
      },
    });
    (window as unknown as { __studio: Record<string, unknown> }).__studio.monaco = monaco;
    return () => ed.dispose();
  }, []);

  // The file: its model, created once from the text read.
  useEffect(() => {
    const ed = editor.current!;
    let model = models.get(p.path);
    if (!model) {
      // A Markdown file is read as a specification: the boards' colours (REQ-171).
      const language = /\.md$/i.test(p.path) ? SPEC_LANGUAGE : "markdown";
      model = monaco.editor.createModel(p.text, language, monaco.Uri.parse(`file:///${p.path}`));
      models.set(p.path, model);
      model.onDidChangeContent(() => props.current.onEdit(p.path, model!.getValue()));
    }
    if (ed.getModel() !== model) ed.setModel(model);
  }, [p.path, p.text]);

  // A focus request is taken once: an editor mounted later — the new group of
  // a split — does not take it again from wherever the Developer has moved
  // focus since, the splitter or the palette (REQ-192). A file changed in a
  // mounted editor is still focused while the request stands.
  const mounted = useRef(false);
  useEffect(() => {
    if (p.focus && (p.focus !== focusTaken || mounted.current)) {
      focusTaken = p.focus;
      editor.current?.focus();
    }
    mounted.current = true;
  }, [p.focus, p.path]);

  // A requirement opened from the Explorer: its heading in view, the cursor on it (REQ-169).
  useEffect(() => {
    const r = p.reveal;
    const ed = editor.current;
    if (!r || !ed || r.path !== p.path) return;
    ed.revealLineNearTop(r.line);
    ed.setPosition({ lineNumber: r.line, column: 1 });
  }, [p.reveal?.n, p.path, p.text]);

  useEffect(() => {
    monaco.editor.setTheme(p.theme === "dark" ? "studio-dark" : "studio-light");
  }, [p.theme]);

  // What the host worked out: lenses, markers, inline questions.
  useEffect(() => {
    const ed = editor.current!;
    const model = models.get(p.path);
    if (!model) return;
    lensHandler = (action, req) => props.current.onLens(action, req);
    lensData = {
      headings: p.annotations?.headings ?? [],
      labels: p.labels,
      commands: p.commands,
      testsOf: p.testsOf,
    };
    lensChanged.fire(undefined as never);
    monaco.editor.setModelMarkers(
      model,
      "specgate",
      (p.annotations?.marks ?? []).map((m) => ({
        startLineNumber: m.line,
        endLineNumber: m.line,
        startColumn: m.startColumn,
        endColumn: m.endColumn,
        severity:
          m.severity === "error"
            ? monaco.MarkerSeverity.Error
            : m.severity === "warning"
              ? monaco.MarkerSeverity.Warning
              : monaco.MarkerSeverity.Info,
        code: m.code,
        source: "specgate",
        message: m.fix ? `${m.message}\nFix: ${m.fix}` : m.message,
      })),
    );
    // Each question: a view zone makes room under its requirement, and an
    // overlay widget at the zone's top holds it — a zone's own content is
    // under the text layer and cannot be clicked.
    for (const w of widgets.current) ed.removeOverlayWidget(w);
    widgets.current = [];
    ed.changeViewZones((zone) => {
      for (const id of zones.current) zone.removeZone(id);
      zones.current = [];
      for (const q of p.annotations?.questions ?? []) {
        const dom = document.createElement("div");
        dom.className = "qzone";
        dom.dataset.question = q.id;
        dom.dataset.req = q.req;
        dom.style.position = "absolute";
        render(
          <InlineQuestion
            q={q}
            labels={p.labels}
            onAnswer={(answer) => props.current.onAnswer({ id: q.id, change: q.change }, answer)}
            onHelp={() => props.current.onQuestionHelp?.({ id: q.id, change: q.change })}
          />,
          dom,
        );
        const widget: monaco.editor.IOverlayWidget = {
          getId: () => `studio.question.${q.change}.${q.id}.${q.req}`,
          getDomNode: () => dom,
          getPosition: () => null,
        };
        ed.addOverlayWidget(widget);
        widgets.current.push(widget);
        zones.current.push(
          zone.addZone({
            afterLineNumber: q.afterLine,
            heightInPx: 150,
            domNode: document.createElement("div"),
            onDomNodeTop: (top) => {
              dom.style.top = `${top}px`;
              dom.style.left = `${ed.getLayoutInfo().contentLeft}px`;
              dom.style.width = `${ed.getLayoutInfo().contentWidth - 40}px`;
            },
          }),
        );
      }
    });
  }, [p.path, p.annotations, p.labels]);

  return <div class="editor" ref={box} data-path={p.path} />;
}

function InlineQuestion(props: {
  q: Annotations["questions"][number];
  labels: EditorPaneProps["labels"];
  onAnswer: (answer: string) => void;
  onHelp: () => void;
}) {
  const { q, labels } = props;
  const [chosen, setChosen] = useState<string>("");
  const [other, setOther] = useState(false);
  return (
    <div class="qbox" role="group" aria-label={`${q.id} ${q.text}`}>
      <div class="qbox-head">
        <span class="qbox-open">{labels.qOpen(q.id, q.req)}</span>
        <span class="qbox-src">{labels.qSource(q.change)}</span>
      </div>
      <div class="qbox-body">
        <div class="qbox-text">
          <span class="sr">{q.id} </span>
          {q.text}
        </div>
        <div class="qopts">
          {q.options.map((o) => (
            <button
              type="button"
              class="btn qopt"
              key={o}
              data-option={o}
              aria-pressed={chosen === o && !other}
              onClick={() => (setOther(false), setChosen(o))}
            >
              {o}
            </button>
          ))}
          {other ? (
            <input
              class="filter"
              aria-label={labels.other}
              placeholder={labels.other}
              ref={(el) => el?.focus()}
              onInput={(e) => setChosen((e.target as HTMLInputElement).value)}
            />
          ) : (
            <button
              type="button"
              class="btn qopt"
              data-act="other"
              onClick={() => (setOther(true), setChosen(""))}
            >
              {labels.other}…
            </button>
          )}
          {chosen.trim() && (
            <button type="button" class="btn pri" onClick={() => props.onAnswer(chosen.trim())}>
              {labels.answer}
            </button>
          )}
          <button
            type="button"
            class="hq"
            aria-label={labels.qHelp}
            title={labels.qHelp}
            onClick={props.onHelp}
          >
            ?
          </button>
        </div>
        <div class="qbox-foot">{labels.qFoot(q.id)}</div>
      </div>
    </div>
  );
}
