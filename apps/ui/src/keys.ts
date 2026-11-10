/** The shortcuts the workbench answers to from the first day (REQ-032, A16). */
export type Action =
  | "palette"
  | "openFile"
  | "save"
  | "closeTab"
  | "nextTab"
  | "previousTab"
  | "toggleSidebar"
  | "togglePanel"
  | "terminal"
  | "explorer"
  | "find"
  | "search"
  | "settings";

export interface KeyPress {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/**
 * The action a key press asks for, or null. "Mod" is Cmd on macOS and Ctrl
 * elsewhere; Ctrl+Tab and Ctrl+` are Ctrl on every system, as in VS Code.
 */
export function shortcut(e: KeyPress, mac: boolean): Action | null {
  if (e.altKey) return null;
  if (e.key === "F1" && !e.ctrlKey && !e.metaKey) return "palette";
  if (e.ctrlKey && !e.metaKey && e.key === "Tab") return e.shiftKey ? "previousTab" : "nextTab";
  if (e.ctrlKey && !e.metaKey && !e.shiftKey && (e.key === "`" || e.key === "Dead"))
    return "terminal";
  const mod = mac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
  if (!mod) return null;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (e.shiftKey) {
    if (k === "p") return "palette";
    if (k === "e") return "explorer";
    if (k === "f") return "search";
    return null;
  }
  switch (k) {
    case "p":
      return "openFile";
    case "s":
      return "save";
    case "w":
      return "closeTab";
    case "b":
      return "toggleSidebar";
    case "j":
      return "togglePanel";
    case "f":
      return "find";
    case ",":
      return "settings";
    default:
      return null;
  }
}
