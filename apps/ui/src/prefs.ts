/**
 * The editor's and the terminal's user settings (draft-settings REQ-143,
 * A10): kept by the host in the Developer's own file, applied here to every
 * editor and terminal open, now and later.
 */
export interface Prefs {
  "editor.fontSize": number;
  "editor.tabSize": number;
  "editor.wordWrap": "on" | "off";
  "terminal.fontSize": number;
  "terminal.scrollback": number;
}

const prefs: Prefs = {
  "editor.fontSize": 13,
  "editor.tabSize": 4,
  "editor.wordWrap": "on",
  "terminal.fontSize": 12,
  "terminal.scrollback": 10_000,
};
const listeners = new Set<(p: Prefs) => void>();

/** What applies now. */
export function currentPrefs(): Prefs {
  return { ...prefs };
}

/** Settings from the user's file, or one just chosen: each well formed one applies at once. */
export function applyPrefs(values: Record<string, string>): void {
  let changed = false;
  for (const [k, v] of Object.entries(values)) {
    if (k === "editor.wordWrap" && (v === "on" || v === "off")) {
      changed ||= prefs[k] !== v;
      prefs[k] = v;
    } else if (k in prefs && k !== "editor.wordWrap") {
      const n = Number(v);
      if (!Number.isInteger(n) || n <= 0) continue;
      const key = k as Exclude<keyof Prefs, "editor.wordWrap">;
      changed ||= prefs[key] !== n;
      prefs[key] = n;
    }
  }
  if (changed) for (const l of listeners) l(currentPrefs());
}

/** Told each time they change; the returned function stops it. */
export function onPrefs(listener: (p: Prefs) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
