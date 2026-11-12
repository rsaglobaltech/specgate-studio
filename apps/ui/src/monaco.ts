/**
 * Monaco, as the editor uses it — only what a specification needs: the API,
 * code lenses, hover, find, folding, the context menu and markdown. This
 * module is the lazy chunk: nothing imports it before the first file opens
 * (draft-editor REQ-041).
 */
import * as monaco from "monaco-editor/editor/editor.api.js";
import "monaco-editor/features/codelens/register.js";
import "monaco-editor/features/hover/register.js";
import "monaco-editor/features/find/register.js";
import "monaco-editor/features/folding/register.js";
import "monaco-editor/features/contextmenu/register.js";
import "monaco-editor/features/clipboard/register.js";
import "monaco-editor/features/gotoError/register.js";
import "monaco-editor/features/wordHighlighter/register.js";
import "monaco-editor/languages/definitions/markdown/register.js";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";

(self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
};

/**
 * A specification as the boards draw it (draft-design-conformance REQ-171):
 * a `### Requirement:` or `#### Scenario:` marker in orange and its title
 * bold and near-white, SHALL in blue, GIVEN/WHEN/THEN/AND/BUT as the
 * boards' keywords, the trace comment dim.
 */
export const SPEC_LANGUAGE = "specmd";
monaco.languages.register({ id: SPEC_LANGUAGE, extensions: [".md"] });
monaco.languages.setMonarchTokensProvider(SPEC_LANGUAGE, {
  defaultToken: "",
  tokenizer: {
    root: [
      [
        /^(#{1,6}\s+)(Requirement:|Scenario:)(.*)$/,
        ["heading.marker", "heading.marker", "heading.text"],
      ],
      [/^#{1,6}\s.*$/, "heading.text"],
      [/<!--/, "comment", "@comment"],
      [/^(\s*[-*]\s+)(GIVEN|WHEN|THEN|AND|BUT)\b/, ["", "keyword.step"]],
      [/\b(SHALL NOT|SHALL|MUST NOT|MUST)\b/, "keyword.shall"],
      [/`[^`]*`/, "string.code"],
      [/^\s*>.*$/, "quote"],
    ],
    comment: [
      [/-->/, "comment", "@pop"],
      [/[^-]+/, "comment"],
      [/./, "comment"],
    ],
  },
});
monaco.languages.setLanguageConfiguration(SPEC_LANGUAGE, {
  comments: { blockComment: ["<!--", "-->"] },
  brackets: [
    ["[", "]"],
    ["(", ")"],
  ],
});

/** The boards' tokens, dark (the default) and light (REQ-034, REQ-171). */
const TOKENS = {
  dark: {
    background: "#15161A",
    text: "#C9C3B9",
    title: "#ECE7DE",
    marker: "#FF8A5C",
    shall: "#6CB6FF",
    step: "#B48EFF",
    comment: "#6B8F71",
    code: "#FFB08F",
    muted: "#9C978E",
    lineNumber: "#5E5A54",
    line: "#1A1B1F",
  },
  light: {
    background: "#FAF8F4",
    text: "#3A362F",
    title: "#1D1B18",
    marker: "#B93D0B",
    shall: "#1F6FEB",
    step: "#7B4FD1",
    comment: "#5B7A60",
    code: "#9A3B10",
    muted: "#6B665E",
    lineNumber: "#A09A90",
    line: "#F0ECE5",
  },
} as const;

for (const [name, base, t] of [
  ["studio-dark", "vs-dark", TOKENS.dark],
  ["studio-light", "vs", TOKENS.light],
] as const) {
  const hex = (c: string) => c.slice(1);
  monaco.editor.defineTheme(name, {
    base,
    inherit: true,
    rules: [
      { token: "", foreground: hex(t.text) },
      { token: "heading.marker", foreground: hex(t.marker), fontStyle: "bold" },
      { token: "heading.text", foreground: hex(t.title), fontStyle: "bold" },
      { token: "keyword.shall", foreground: hex(t.shall) },
      { token: "keyword.step", foreground: hex(t.step) },
      { token: "comment", foreground: hex(t.comment) },
      { token: "string.code", foreground: hex(t.code) },
      { token: "quote", foreground: hex(t.muted), fontStyle: "italic" },
    ],
    colors: {
      "editor.background": t.background,
      "editor.foreground": t.text,
      "editorLineNumber.foreground": t.lineNumber,
      "editorLineNumber.activeForeground": t.title,
      "editor.lineHighlightBackground": t.line,
      "editor.lineHighlightBorder": t.line,
      "editorCodeLens.foreground": t.muted,
    },
  });
}

export { monaco };
