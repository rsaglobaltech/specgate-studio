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
  | "settings"
  | "splitRight"
  | "chord"
  | "focusGroup1"
  | "focusGroup2"
  | "focusGroup3"
  | "toggleAgent";

export interface KeyPress {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  /** The physical key, for keys whose character a layout or Alt changes (Option+B on macOS). */
  code?: string;
}

/**
 * The action a key press asks for, or null. "Mod" is Cmd on macOS and Ctrl
 * elsewhere; Ctrl+Tab and Ctrl+` are Ctrl on every system, as in VS Code.
 */
export function shortcut(e: KeyPress, mac: boolean): Action | null {
  const modDown = mac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
  // Ctrl/Cmd+Alt+B: the agent panel (draft-workbench-v2 A22).
  if (modDown && e.altKey && !e.shiftKey && (e.code === "KeyB" || e.key.toLowerCase() === "b"))
    return "toggleAgent";
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
  // Editor groups (draft-workbench-v2 REQ-188, REQ-189, A18).
  if (k === "\\" || e.code === "Backslash") return "splitRight";
  if (k === "1") return "focusGroup1";
  if (k === "2") return "focusGroup2";
  if (k === "3") return "focusGroup3";
  switch (k) {
    case "k":
      return "chord";
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
