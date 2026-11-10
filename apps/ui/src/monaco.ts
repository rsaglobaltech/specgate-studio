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

monaco.editor.defineTheme("studio-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [],
  colors: { "editor.background": "#15161A", "editorCodeLens.foreground": "#FF8A5C" },
});
monaco.editor.defineTheme("studio-light", {
  base: "vs",
  inherit: true,
  rules: [],
  colors: { "editor.background": "#FAF8F4", "editorCodeLens.foreground": "#B93D0B" },
});

export { monaco };
