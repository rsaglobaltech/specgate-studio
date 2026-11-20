/**
 * The cold start, measured in the window itself (draft-workbench REQ-035
 * SCN-099). Only when the host serves the page in measure mode — the
 * `studio-measure` meta it adds when started with STUDIO_MEASURE — does the
 * page press the palette's shortcut once the activity bar shows, and send
 * the moments back: `apps/desktop/scripts/measure.mjs --cold-start` compares
 * them with the moment it launched the app. Otherwise nothing runs.
 */

/** Wall-clock milliseconds (epoch) of each moment, so a process outside the page can compare them. */
export interface ColdStart {
  /** The page's navigation began. */
  origin: number;
  /** The activity bar is on screen. */
  visible: number;
  /** The command palette is open, from its shortcut pressed as soon as the bar showed. */
  palette: number;
}

/** Where the page sends its moments: the host writes them to STUDIO_MEASURE's file. */
export const MEASURE_PATH = "/__studio/measure";

export function measuring(doc: Document = document): boolean {
  return doc.querySelector('meta[name="studio-measure"]') !== null;
}

/** Resolves on the first animation frame where `check` holds. */
function frameWhen(check: () => boolean): Promise<void> {
  return new Promise((done) => {
    const step = () => (check() ? done() : requestAnimationFrame(step));
    step();
  });
}

/**
 * Waits for the activity bar, presses Mod+Shift+P as the Developer does
 * (Cmd on macOS, Ctrl elsewhere), waits for the palette, and posts the
 * moments to the host.
 */
export async function measureColdStart(mac: boolean, doc: Document = document): Promise<ColdStart> {
  const at = () => performance.timeOrigin + performance.now();
  await frameWhen(() => doc.querySelector(".activity .sga") !== null);
  const visible = at();
  // The shortcuts answer once the workbench has put its listener in place.
  await frameWhen(() => doc.body.dataset.ready === "1");
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "P",
      code: "KeyP",
      shiftKey: true,
      ctrlKey: !mac,
      metaKey: mac,
      bubbles: true,
      cancelable: true,
    }),
  );
  await frameWhen(() => doc.querySelector(".palette") !== null);
  const moments: ColdStart = { origin: performance.timeOrigin, visible, palette: at() };
  await fetch(MEASURE_PATH, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(moments),
  });
  return moments;
}
