import type { ViewId } from "./views.js";

/** The activity bar's icons, as drawn on the canvas "Studio IDE" (A3). */
const PATHS: Record<ViewId, string[]> = {
  home: ["M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"],
  explorer: ["M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z", "M14 3v6h6"],
  brief: ["M4 20h4L19 9l-4-4L4 16z"],
  changes: ["M6 8.5v7M18 11.5c0 4-6 3-11 4.5"],
  questions: ["M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"],
  build: ["M7 4l13 8-13 8z"],
  live: ["M3 12h4l3-7 4 14 3-7h4"],
  traceability: ["M10 6.5h4a3 3 0 0 1 3 3V14"],
  report: ["M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z", "M8.5 12l2.5 2.5 4.5-5"],
  help: ["M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5M12 17h.01"],
  settings: ["M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"],
};

export function ViewIcon({ view }: { view: ViewId }) {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {view === "changes" && (
        <>
          <circle cx="6" cy="6" r="2.5" />
          <circle cx="6" cy="18" r="2.5" />
          <circle cx="18" cy="9" r="2.5" />
        </>
      )}
      {view === "traceability" && (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </>
      )}
      {view === "help" && <circle cx="12" cy="12" r="9" />}
      {view === "settings" && (
        <>
          <circle cx="15" cy="6" r="2" />
          <circle cx="9" cy="12" r="2" />
          <circle cx="17" cy="18" r="2" />
        </>
      )}
      {PATHS[view].map((d) => (
        <path d={d} key={d} />
      ))}
    </svg>
  );
}

export function Logo() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--accent)"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h10M4 17h6" />
      <path d="M16 15l2 2 4-4" />
    </svg>
  );
}
