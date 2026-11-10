/** The workbench's views, in the activity bar's order (REQ-031). */
export const TOP_VIEWS = [
  "home",
  "explorer",
  "brief",
  "changes",
  "questions",
  "build",
  "live",
  "traceability",
  "report",
] as const;

export const BOTTOM_VIEWS = ["help", "settings"] as const;

export type ViewId = (typeof TOP_VIEWS)[number] | (typeof BOTTOM_VIEWS)[number];

export const ALL_VIEWS: readonly ViewId[] = [...TOP_VIEWS, ...BOTTOM_VIEWS];

/** The bottom panel's tabs (REQ-032). */
export const PANEL_TABS = ["terminal", "gate", "problems", "agent", "traceability"] as const;
export type PanelTab = (typeof PANEL_TABS)[number];
