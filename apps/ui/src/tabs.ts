/** The editor's tabs: which files are open and which one is active (REQ-032). */
export interface Tabs {
  open: string[];
  active: string | null;
}

export function openTab(tabs: Tabs, path: string): Tabs {
  return tabs.open.includes(path)
    ? { ...tabs, active: path }
    : { open: [...tabs.open, path], active: path };
}

export function closeTab(tabs: Tabs, path: string): Tabs {
  const at = tabs.open.indexOf(path);
  if (at < 0) return tabs;
  const open = tabs.open.filter((p) => p !== path);
  const active = tabs.active !== path ? tabs.active : (open[Math.min(at, open.length - 1)] ?? null);
  return { open, active };
}

function step(tabs: Tabs, by: number): Tabs {
  if (tabs.open.length === 0 || tabs.active === null) return tabs;
  const at = tabs.open.indexOf(tabs.active);
  const n = tabs.open.length;
  return { ...tabs, active: tabs.open[(at + by + n) % n] ?? null };
}

export const nextTab = (tabs: Tabs): Tabs => step(tabs, 1);
export const previousTab = (tabs: Tabs): Tabs => step(tabs, -1);

/** A renamed file's tab — or those under a renamed folder — follows the new name (REQ-166). */
export function renameTab(tabs: Tabs, from: string, to: string): Tabs {
  const map = (p: string) =>
    p === from || p.startsWith(`${from}/`) ? to + p.slice(from.length) : p;
  return { open: tabs.open.map(map), active: tabs.active === null ? null : map(tabs.active) };
}

/** Every tab `gone` says, closed: a deleted file's, or those under a deleted folder (REQ-166). */
export function closeTabs(tabs: Tabs, gone: (path: string) => boolean): Tabs {
  let t = tabs;
  for (const p of tabs.open) if (gone(p)) t = closeTab(t, p);
  return t;
}
