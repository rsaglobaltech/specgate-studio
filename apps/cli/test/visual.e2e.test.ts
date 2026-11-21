/**
 * visual-regression REQ-231, the screens: each key screen of the studio at
 * 1440×900, compared with its reference in `test/visual/<platform>/`.
 *
 * The screens are taken on projects that read the same on every run:
 *   - sprich, fed by fakes (./sprich.ts) — the workbench's views, in
 *     English and Spanish, dark and light;
 *   - an empty folder — the five questions (REQ-174);
 *   - shop and notes, adopted by the real specgate — a project's first Home
 *     with its baseline left out (REQ-230), and an undecided stack in the
 *     readiness list (REQ-228).
 *
 * Run on Linux (the gate on CI) and on a Developer's Mac; skipped elsewhere
 * (`COMPARES`, ./visual.ts). An intended change of the UI:
 *
 *   STUDIO_VISUAL_UPDATE=1 npm test     then review the new images in the diff
 */
import test from "node:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { adopted, withClaude } from "@specgate-studio/adapter-specgate-cli/testing";
import { serve } from "../src/index.js";
import { close, open, type Page } from "./support.js";
import { sprich } from "./sprich.js";
import { CLOCK, COMPARES, expectScreen } from "./visual.js";

const SKIP = COMPARES
  ? {}
  : { skip: "visual references are compared on Linux and a Developer's Mac" };
const SLOW = { ...SKIP, timeout: 180_000 };

/**
 * The workbench's views on sprich, each opened from the activity bar and
 * given time to read what it shows. `ready` is what the view draws once it
 * has read it.
 */
const SPRICH_VIEWS: Array<{ view: string; ready: string }> = [
  { view: "home", ready: ".home .next" },
  { view: "explorer", ready: ".tree" },
  { view: "brief", ready: ".content" },
  { view: "changes", ready: ".content .side" },
  { view: "questions", ready: ".qdetail h2" },
  { view: "build", ready: ".content .side" },
  { view: "live", ready: ".content" },
  { view: "traceability", ready: ".content" },
  { view: "report", ready: ".content" },
  { view: "help", ready: ".content" },
  { view: "settings", ready: ".settings .setting" },
];

/** Opens a view from the activity bar and waits until it has drawn what it read. */
async function show(page: Page, view: string, ready: string): Promise<void> {
  if (view !== "home") await page.click(`.sga[data-view="${view}"]`);
  await page.waitForSelector(ready);
  // What the view reads after it first draws (counts, the gate's state) settles.
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(400);
}

for (const { view, ready } of SPRICH_VIEWS) {
  test(`REQ-231 SCN-1008: sprich's ${view}, as its reference`, SKIP, async () => {
    const s = await sprich();
    const page = await open(s, { clock: CLOCK });
    try {
      await show(page, view, ready);
      await expectScreen(page, `sprich-${view}`);
    } finally {
      await close(s, page);
    }
  });
}

test("REQ-231 SCN-1008: sprich's Home in Spanish, as its reference", SKIP, async () => {
  const s = await sprich();
  const page = await open(s, { lang: "es", clock: CLOCK });
  try {
    await show(page, "home", ".home .next");
    await expectScreen(page, "sprich-home-es");
  } finally {
    await close(s, page);
  }
});

test("REQ-231 SCN-1008: sprich's Home in the light theme, as its reference", SKIP, async () => {
  const s = await sprich();
  const page = await open(s, { lang: "en", theme: "light", clock: CLOCK });
  try {
    await show(page, "home", ".home .next");
    await expectScreen(page, "sprich-home-light");
  } finally {
    await close(s, page);
  }
});

test(
  "REQ-231 SCN-1008: an empty folder's Home — the five questions, as its reference",
  SLOW,
  async () => {
    // Claude Code on the PATH, so the agent's card reads "detected" on every runner.
    const claude = withClaude(true);
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), "sg-visual-"));
    const dir = path.join(parent, "academia");
    fs.mkdirSync(dir);
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "sg-visual-home-"));
    const host = await serve({ projectDir: dir, port: 0, home });
    const page = await open({ url: host.url.replace(/^ws/, "http") }, { clock: CLOCK });
    try {
      await page.waitForSelector('[data-setup="create"]');
      // The command names the studio's temporary config file: covered.
      await expectScreen(page, "empty-folder", { cover: [".setup-cmd"] });
    } finally {
      await close({ host }, page);
      claude.restore();
      for (const d of [parent, home])
        await fs.promises.rm(d, { recursive: true, force: true, maxRetries: 40, retryDelay: 250 });
    }
  },
);

/**
 * A folder the real specgate adopted, served with a settings folder of its
 * own; Claude Code on the PATH so the readiness list's agent is the same on
 * every runner.
 */
async function adoptedStudio(name: string, code: boolean) {
  const claude = withClaude(true);
  const dir = adopted(name, { code });
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "sg-visual-home-"));
  const host = await serve({ projectDir: dir, port: 0, home });
  const page = await open({ url: host.url.replace(/^ws/, "http") }, { clock: CLOCK });
  return {
    page,
    done: async () => {
      await close({ host }, page);
      claude.restore();
      for (const d of [path.dirname(dir), home])
        await fs.promises.rm(d, { recursive: true, force: true, maxRetries: 40, retryDelay: 250 });
    },
  };
}

test(
  "REQ-231 SCN-1008: shop just adopted — its Home with the baseline left out, as its reference",
  SLOW,
  async () => {
    const { page, done } = await adoptedStudio("shop", true);
    try {
      // The adopted Home, once the areas adoption found are read (REQ-115).
      await page.waitForSelector('[data-next="specify"]');
      await page.waitForSelector('[data-testid="home-baseline"]');
      await expectScreen(page, "shop-adopted-home");
    } finally {
      await done();
    }
  },
);

test(
  "REQ-231 SCN-1008: notes, an empty folder adopted — its readiness list with the stack to decide, as its reference",
  SLOW,
  async () => {
    const { page, done } = await adoptedStudio("notes", false);
    try {
      await page.waitForSelector('[data-testid="next-title"]');
      await page.click('[data-testid="next-go"]');
      await page.waitForSelector('[data-ready="stack"][data-undecided="true"]');
      await expectScreen(page, "notes-readiness");
    } finally {
      await done();
    }
  },
);
