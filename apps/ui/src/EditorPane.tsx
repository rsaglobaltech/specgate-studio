import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { Annotations } from "@specgate-studio/protocol";
import { monaco } from "./monaco.js";

export type LensAction = "build" | "check" | "trace" | "ask" | "help";

export interface EditorPaneProps {
  path: string;
  /** The file's text as last read or saved. */
  text: string;
  theme: "dark" | "light";
  annotations: Annotations | null;
  labels: Record<LensAction, string> & { answer: string; other: string; options: string };
  commands: Record<Exclude<LensAction, "help">, (req: string) => string>;
  onEdit: (path: string, value: string) => void;
  onLens: (action: LensAction, req: string) => void;
  onAnswer: (q: { id: string; change: string }, answer: string) => void;
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
} | null = null;
const lensChanged = new monaco.Emitter<monaco.languages.CodeLensProvider>();
const COMMAND = "studio.lens";
monaco.editor.registerCommand(COMMAND, (_accessor, action: LensAction, req: string) =>
  lensHandler(action, req),
);

/** Build, Check, Trace, Ask for a change and "?" above each requirement (REQ-042). */
monaco.languages.registerCodeLensProvider("markdown", {
  onDidChange: lensChanged.event,
  provideCodeLenses: () => {
    if (!lensData) return { lenses: [], dispose: () => undefined };
    const { headings, labels, commands } = lensData;
    const lenses: monaco.languages.CodeLens[] = [];
    for (const h of headings) {
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
      }
    }
    return { lenses, dispose: () => undefined };
  },
});

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
      lineHeight: 21,
      fontFamily: "'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace",
      scrollBeyondLastLine: false,
      codeLens: true,
      renderValidationDecorations: "on",
    });
    editor.current = ed;
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
      model = monaco.editor.createModel(p.text, "markdown", monaco.Uri.parse(`file:///${p.path}`));
      models.set(p.path, model);
      model.onDidChangeContent(() => props.current.onEdit(p.path, model!.getValue()));
    }
    if (ed.getModel() !== model) ed.setModel(model);
  }, [p.path, p.text]);

  useEffect(() => {
    monaco.editor.setTheme(p.theme === "dark" ? "studio-dark" : "studio-light");
  }, [p.theme]);

  // What the host worked out: lenses, markers, inline questions.
  useEffect(() => {
    const ed = editor.current!;
    const model = models.get(p.path);
    if (!model) return;
    lensHandler = (action, req) => props.current.onLens(action, req);
    lensData = { headings: p.annotations?.headings ?? [], labels: p.labels, commands: p.commands };
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
            heightInPx: 76,
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
}) {
  const [chosen, setChosen] = useState<string>("");
  return (
    <div class="qbox" role="group" aria-label={`${props.q.id} ${props.q.text}`}>
      <div>
        <b>{props.q.id}</b> {props.q.text}
      </div>
      <div class="qopts">
        <span class="muted">{props.labels.options}</span>
        {props.q.options.map((o) => (
          <button
            type="button"
            class="btn"
            key={o}
            data-option={o}
            aria-pressed={chosen === o}
            onClick={() => setChosen(o)}
          >
            {o}
          </button>
        ))}
        <input
          class="filter"
          aria-label={props.labels.other}
          placeholder={props.labels.other}
          onInput={(e) => setChosen((e.target as HTMLInputElement).value)}
        />
        <button
          type="button"
          class="btn pri"
          disabled={!chosen.trim()}
          onClick={() => props.onAnswer(chosen.trim())}
        >
          {props.labels.answer}
        </button>
      </div>
    </div>
  );
}
