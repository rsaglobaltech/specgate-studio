/**
 * Visual regression (visual-regression REQ-231): each key screen of the
 * studio is kept as a reference image, and a test fails when the screen as
 * it is now differs from it.
 *
 * Why this exists: the end-to-end tests read the DOM — text, attributes,
 * computed styles — so a wrong title, a line flush against a card or a
 * panel pushed out of view passes them. Only the pixels show those.
 *
 * How it works:
 *   1. `settle()` makes the page the same on every run: animations,
 *      transitions and the caret off, the fonts loaded, and the parts that
 *      change between runs (a temporary folder's path, the git branch)
 *      covered with a flat block.
 *   2. `expectScreen()` takes the screenshot at 1440×900 and compares it
 *      with `test/visual/<platform>/<name>.png`.
 *   3. The comparison runs in Chromium itself (`comparePng`): both images
 *      drawn on a canvas, pixel by pixel. No image library is added to the
 *      project for it.
 *
 * Each operating system draws fonts its own way, so each has its own
 * references. The gate on CI checks Linux; a Developer's Mac checks its own
 * references locally; Windows is not compared.
 *
 *   STUDIO_VISUAL_UPDATE=1 npm test   rewrites every reference (an intended change)
 *
 * A missing reference is written on the Developer's machine and the test
 * passes, saying so; on CI it fails, with the screen it took written to
 * `test-results/visual/` — the workflow uploads it as the `visual` artifact,
 * to be reviewed and committed as the reference.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { browser, type Page } from "./support.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * The source folder `test/`, wherever the compiled test runs from: the tests
 * run as `dist/test/*.js`, but the references live beside the sources so git
 * keeps them.
 */
const TEST_SRC = [path.join(HERE, "..", "..", "test"), HERE].find((d) =>
  fs.existsSync(path.join(d, "support.ts")),
)!;

/** Where the references are kept, one folder per operating system. */
export const REFERENCES = path.join(TEST_SRC, "visual");

/** Where a failed comparison writes the screen as it is now, and its differences. */
export const RESULTS = path.join(TEST_SRC, "..", "test-results", "visual");

/** The size every screen is taken at: the boards' desktop size (REQ-202). */
export const VIEWPORT = { width: 1440, height: 900 };

/**
 * The share of pixels that may differ before a screen fails: 0.2 %, about
 * 2 600 pixels of 1440×900 — under one line of text, so a moved line, a
 * changed word or a new margin fails, while antialiasing noise passes.
 */
export const MAX_DIFF_RATIO = 0.002;

/**
 * How far apart two pixels' colours may be and still count as the same: the
 * largest difference of red, green or blue, out of 255. Text drawn on a
 * slightly different subpixel stays under it; a different colour does not.
 */
export const PIXEL_TOLERANCE = 24;

/**
 * Whether this run compares screens: Linux always (the gate on CI), a Mac
 * only on a Developer's machine — the macOS CI runner draws fonts unlike a
 * desktop Mac. Windows never.
 */
export const COMPARES =
  process.platform === "linux" || (process.platform === "darwin" && !process.env.CI);

/**
 * The time every screen is taken at: the page's clock is held there
 * (`open(…, { clock: CLOCK })`), so the Report's date and the activity's
 * "2 h ago" read the same on every run.
 */
export const CLOCK = new Date("2026-11-21T09:00:00Z");

/** Selectors covered by a flat block before each screenshot: what changes between runs. */
export const ALWAYS_COVERED = [
  // The panel's header: the Developer's shell (zsh, bash) and the project's temporary folder.
  '[data-testid="panel-shell"]',
  // The status bar's branch: `main` or `master`, as the runner's git names it.
  '[data-testid="status-branch"]',
  // Settings' User note names the Developer's settings file, in the run's temporary folder.
  '.settings-scope[data-scope="user"] > .settings-where',
];

/**
 * Makes the page draw the same on every run: no animation, no transition,
 * no caret blinking, fonts loaded, the scroll at the top, and the selectors
 * given — with `ALWAYS_COVERED` — painted over with a flat block that keeps
 * their size, so the layout around them does not move.
 */
export async function settle(page: Page, cover: readonly string[] = []): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
      ${[...ALWAYS_COVERED, ...cover].join(",\n")} {
        color: transparent !important;
        background: #3a3b42 !important;
        border-color: transparent !important;
      }
      ${[...ALWAYS_COVERED, ...cover].map((s) => `${s} *`).join(",\n")} {
        visibility: hidden !important;
      }
    `,
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Two frames: the style above applied, the layout done.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}

/** What comparing two images found. */
export interface Comparison {
  /** Both images have the same size. */
  sameSize: boolean;
  /** Pixels whose colour differs by more than the tolerance. */
  differing: number;
  /** Pixels in all. */
  total: number;
  /** The differences in red over the reference greyed out, as a PNG; null when none differ. */
  diff: Buffer | null;
}

/**
 * Compares two PNG images pixel by pixel, in Chromium: each drawn on a
 * canvas, its pixels read back, and every pixel whose red, green or blue
 * differs by more than `tolerance` counted — and painted red on a greyed-out
 * copy of the reference, the image a reviewer opens to see what changed.
 */
export async function comparePng(
  reference: Buffer,
  actual: Buffer,
  tolerance = PIXEL_TOLERANCE,
): Promise<Comparison> {
  const page = await browser.newPage();
  try {
    const out = await page.evaluate(
      async ({ a, b, tol }) => {
        const load = async (b64: string) => {
          const img = new Image();
          img.src = `data:image/png;base64,${b64}`;
          await img.decode();
          return img;
        };
        const [ref, now] = await Promise.all([load(a), load(b)]);
        if (ref.width !== now.width || ref.height !== now.height)
          return { sameSize: false, differing: 0, total: 0, diff: null };
        const { width: w, height: h } = ref;
        const pixels = (img: HTMLImageElement) => {
          const c = document.createElement("canvas");
          c.width = w;
          c.height = h;
          const ctx = c.getContext("2d")!;
          ctx.drawImage(img, 0, 0);
          return ctx.getImageData(0, 0, w, h);
        };
        const p = pixels(ref);
        const q = pixels(now);
        // The image of the differences: the reference, faded to grey…
        const d = new ImageData(w, h);
        let differing = 0;
        for (let i = 0; i < p.data.length; i += 4) {
          const delta = Math.max(
            Math.abs(p.data[i]! - q.data[i]!),
            Math.abs(p.data[i + 1]! - q.data[i + 1]!),
            Math.abs(p.data[i + 2]! - q.data[i + 2]!),
          );
          if (delta > tol) {
            // …with each differing pixel in red.
            differing++;
            d.data[i] = 255;
            d.data[i + 1] = 0;
            d.data[i + 2] = 0;
          } else {
            const grey = (p.data[i]! + p.data[i + 1]! + p.data[i + 2]!) / 3;
            d.data[i] = d.data[i + 1] = d.data[i + 2] = 40 + grey * 0.3;
          }
          d.data[i + 3] = 255;
        }
        let diff: string | null = null;
        if (differing > 0) {
          const c = document.createElement("canvas");
          c.width = w;
          c.height = h;
          c.getContext("2d")!.putImageData(d, 0, 0);
          diff = c.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
        }
        return { sameSize: true, differing, total: w * h, diff };
      },
      { a: reference.toString("base64"), b: actual.toString("base64"), tol: tolerance },
    );
    return { ...out, diff: out.diff ? Buffer.from(out.diff, "base64") : null };
  } finally {
    await page.close();
  }
}

/** Where a screen's reference is, and where a failed comparison writes. */
export interface ScreenPaths {
  reference: string;
  actual: string;
  diff: string;
}

export function screenPaths(
  name: string,
  platform: string = process.platform,
  dirs = { references: REFERENCES, results: RESULTS },
): ScreenPaths {
  return {
    reference: path.join(dirs.references, platform, `${name}.png`),
    actual: path.join(dirs.results, platform, `${name}.actual.png`),
    diff: path.join(dirs.results, platform, `${name}.diff.png`),
  };
}

/** What became of a screen. */
export type Verdict =
  | { kind: "same"; ratio: number }
  | { kind: "written"; reference: string }
  | { kind: "missing"; actual: string }
  | { kind: "changed"; ratio: number; actual: string; diff: string }
  | { kind: "resized"; actual: string };

/**
 * Judges a screenshot against its reference (REQ-231): the reference
 * rewritten when `update`, written when missing on a Developer's machine,
 * missing on CI; otherwise the same, or changed beyond `MAX_DIFF_RATIO` —
 * then the screen as it is now and its differences are written beside the
 * other results.
 */
export async function judge(
  name: string,
  png: Buffer,
  opts: {
    update?: boolean;
    ci?: boolean;
    platform?: string;
    dirs?: { references: string; results: string };
  } = {},
): Promise<Verdict> {
  const update = opts.update ?? process.env.STUDIO_VISUAL_UPDATE === "1";
  const ci = opts.ci ?? !!process.env.CI;
  const p = screenPaths(name, opts.platform, opts.dirs);
  const write = (file: string, bytes: Buffer) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bytes);
  };
  if (update || (!fs.existsSync(p.reference) && !ci)) {
    write(p.reference, png);
    return { kind: "written", reference: p.reference };
  }
  if (!fs.existsSync(p.reference)) {
    write(p.actual, png);
    return { kind: "missing", actual: p.actual };
  }
  const c = await comparePng(fs.readFileSync(p.reference), png);
  if (!c.sameSize) {
    write(p.actual, png);
    return { kind: "resized", actual: p.actual };
  }
  const ratio = c.differing / c.total;
  if (ratio <= MAX_DIFF_RATIO) return { kind: "same", ratio };
  write(p.actual, png);
  write(p.diff, c.diff!);
  return { kind: "changed", ratio, actual: p.actual, diff: p.diff };
}

/** The failure a verdict makes, in words a reviewer acts on; null when it passes. */
export function failureOf(name: string, v: Verdict): string | null {
  switch (v.kind) {
    case "same":
    case "written":
      return null;
    case "missing":
      return `${name}: no reference for ${process.platform}. The screen is in ${v.actual}: review it, then commit it as test/visual/${process.platform}/${name}.png.`;
    case "resized":
      return `${name}: the screen's size differs from its reference. Now: ${v.actual}.`;
    case "changed":
      return `${name}: ${(v.ratio * 100).toFixed(2)} % of the pixels differ (more than ${MAX_DIFF_RATIO * 100} %). Now: ${v.actual}. Differences in red: ${v.diff}. Intended? STUDIO_VISUAL_UPDATE=1 npm test rewrites the references.`;
  }
}

/**
 * Settles the page, takes the screen and judges it against its reference;
 * throws what `failureOf` says when it fails.
 */
export async function expectScreen(
  page: Page,
  name: string,
  opts: { cover?: readonly string[] } = {},
): Promise<Verdict> {
  await settle(page, opts.cover);
  const png = await page.screenshot({ animations: "disabled", caret: "hide" });
  const verdict = await judge(name, png);
  if (verdict.kind === "written") console.log(`visual: wrote ${verdict.reference}`);
  const failure = failureOf(name, verdict);
  if (failure) throw new Error(failure);
  return verdict;
}
