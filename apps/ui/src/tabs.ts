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
