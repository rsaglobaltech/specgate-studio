/**
 * draft-live-polish REQ-202 in a real browser: every view at 1440×900 and at
 * 1280×800, with the side bar and the agent panel at their default width, at
 * their minimum, and hidden — no control or panel over another, no empty
 * column, no side panel scrolling sideways (A16). And the two places the demo
 * broke: Live's module map during a build, and Build's side panel narrowed.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { MOD, close, open, studio, type Page } from "./support.js";
import { PLAN, SETTINGS, buildAnswers } from "./build-support.js";
import { audit } from "./audit.js";

const VIEWS = [
  "home",
  "explorer",
  "brief",
  "changes",
  "questions",
  "build",
  "live",
  "traceability",
  "report",
  "help",
  "settings",
] as const;
const SIZES = [
  [1440, 900],
  [1280, 800],
] as const;

const width = (page: Page, sel: string) =>
  page.$eval(sel, (el) => el.getBoundingClientRect().width).catch(() => 0);

/** A splitter dragged as far as it goes (draft-workbench-v2 REQ-190): its panel at its minimum. */
async function narrow(page: Page, sash: string, by: number) {
  const r = await page.$eval(sash, (el) => {
    const b = el.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + 200 };
  });
  await page.mouse.move(r.x, r.y);
  await page.mouse.down();
  await page.mouse.move(r.x + by, r.y, { steps: 8 });
  await page.mouse.up();
}

/** default: as the studio opens; shown: the side bar shown everywhere (Ctrl/Cmd+B); minimum: both at their minimum; hidden: both hidden. */
type Frame = "default" | "shown" | "minimum" | "hidden";

async function frame(page: Page, f: Frame) {
  if (f === "shown" || f === "minimum") {
    await page.keyboard.press(`${MOD}+B`);
    await page.waitForSelector(".middle > .side");
  }
  if (f === "minimum") {
    await narrow(page, '[data-testid="side-sash"]', -600);
    await narrow(page, '[data-testid="agent-sash"]', 900);
  } else if (f === "hidden") {
    await page.click('[data-testid="agent-hide"]');
    await page.waitForSelector(".agent", { state: "detached" });
  }
}

/** Each view shown and audited; what the audit finds, by view. */
async function auditViews(page: Page, where: string): Promise<string[]> {
  const found: string[] = [];
  for (const v of VIEWS) {
    await page.click(`.sga[data-view="${v}"]`);
    await page.waitForSelector(`.sga[data-view="${v}"][aria-current="page"]`);
    await page.waitForTimeout(150);
    for (const f of await audit(page)) found.push(`${where} ${v}: ${f}`);
  }
  return found;
}

for (const [w, h] of SIZES)
  for (const f of ["default", "shown", "minimum", "hidden"] as const)
    test(`REQ-202: every view at ${w}×${h}, ${
      {
        default: "as the studio opens",
        shown: "the side bar shown at its default width",
        minimum: "the side bar and the agent panel at their minimum",
        hidden: "the side bar and the agent panel hidden",
      }[f]
    } — nothing over anything, no dead column, no sideways scroll`, async () => {
      const s = await studio({
        homeRequirements: SETTINGS as never,
        specgate: { ...buildAnswers("claude -p < {prompt_file}"), plan: PLAN },
      });
      const page = await open(s, { lang: "es" });
      try {
        await page.setViewportSize({ width: w, height: h });
        await frame(page, f);
        if (f === "minimum") {
          assert.equal(await width(page, ".middle > .side"), 180, "the side bar at its minimum");
          assert.equal(await width(page, ".agent"), 220, "the agent panel at its minimum");
        }
        assert.deepEqual(await auditViews(page, `${w}×${h} ${f}`), []);
      } finally {
        await close(s, page);
      }
    });

/** 14 modules of 4 requirements, REQ-141 in settings: the studio's own (A16). */
function fourteen() {
  const names = [
    "core-host",
    "specgate-port",
    "workspace",
    "editor",
    "terminal",
    "help",
    "project-setup",
    "questions",
    "brief",
    "changes",
    "build-live",
    "explorer-tree",
    "design-conformance",
    "settings",
  ];
  return names.flatMap((m, i) =>
    Array.from({ length: 4 }, (_, j) => ({
      id: m === "settings" && j === 0 ? "REQ-141" : `REQ-${String(300 + i * 4 + j)}`,
      title: m === "settings" && j === 0 ? "A settings editor with search" : `${m} ${j}`,
      category: m === "settings" ? "NEEDS_EVERYTHING" : "DONE",
      needs: m === "settings" ? "a test and code" : null,
      change: `draft-${m}`,
    })),
  );
}

test("REQ-202 SCN-604: Live on the desktop at 1280×800 building REQ-141 with 14 modules — the map scrolls inside its column, the steps and SALIDA DEL AGENTE whole, nothing over anything", async () => {
  const s = await studio({
    homeRequirements: fourteen() as never,
    specgate: { ...buildAnswers("claude -p < {prompt_file}"), plan: PLAN },
  });
  const page = await open(s, { lang: "es" });
  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.click('.sga[data-view="build"]');
    await page.click('.breq[data-req="REQ-141"] [data-act="build"]');
    await page.waitForSelector('.bstarted[data-req="REQ-141"]');
    const t = Date.now() / 1000;
    s.events.append("REQ-141", { t, attempt: 1, type: "attempt", state: "start" });
    for (let i = 0; i < 40; i++)
      s.events.append("REQ-141", {
        t: t + i / 10,
        attempt: 1,
        type: "step",
        kind: i % 3 ? "read" : "shell",
        tool: "Bash",
        target: `cd /private/var/folders/h8/specgate-harness-REQ-141 && grep -rn settings packages apps | head -${i}`,
        result: "ok",
      });
    await page.click('.sga[data-view="live"]');
    await page.waitForSelector('.lreq[data-req="REQ-141"]');
    await page.waitForSelector('[data-testid="live-output"] li[data-kind]');
    assert.equal(await page.$$eval(".ltile-group", (els) => els.length), 14);
    const map = await page.$eval(".lcols > .side .ltiles", (el) => ({
      scrolls: el.scrollHeight > el.clientHeight,
      overflowY: getComputedStyle(el).overflowY,
      bottom: el.parentElement!.getBoundingClientRect().bottom,
    }));
    assert.ok(map.scrolls && map.overflowY === "auto", "the map scrolls inside its column");
    // The queue below it, in view.
    const queue = await page.$eval('[data-testid="live-queue"] li[data-req="REQ-141"]', (el) =>
      el.getBoundingClientRect(),
    );
    const panel = await page.$eval(".panel", (el) => el.getBoundingClientRect().top);
    assert.ok(map.bottom <= panel + 1, "the map ends above the bottom panel");
    assert.ok(queue.bottom <= map.bottom, "the queue in view under the map");
    const stages = await page.$eval(".lstages", (el) => el.getBoundingClientRect());
    const center = await page.$eval(".lcols > .detail", (el) => el.getBoundingClientRect());
    assert.ok(stages.bottom <= center.bottom, "the steps whole in the centre");
    const log = await page.$eval('[data-testid="live-log"]', (el) => el.getBoundingClientRect());
    assert.ok(log.height >= 140 && log.bottom <= center.bottom + 1, "SALIDA DEL AGENTE whole");
    assert.deepEqual(await audit(page), []);
  } finally {
    await close(s, page);
  }
});

test("REQ-202 SCN-605: Build in the browser at 1440×900 with 10 files waiting — the side bar at its minimum, then the agent panel closed: no sideways scroll, the content takes the agent's room", async () => {
  const s = await studio({
    homeRequirements: SETTINGS as never,
    specgate: { ...buildAnswers("claude -p < {prompt_file}"), plan: PLAN },
    uncommitted: [
      ...Array.from({ length: 9 }, (_, i) => `.claude/commands/specgate/c${i}.md`),
      "CLAUDE.md",
    ],
  });
  const page = await open(s, { lang: "es" });
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.click('.sga[data-view="build"]');
    await page.click('.breq[data-req="REQ-141"] [data-act="build"]');
    await page.waitForSelector('[data-testid="build-waits"]');
    await page.keyboard.press(`${MOD}+B`);
    await page.waitForSelector(".middle > .side");
    await narrow(page, '[data-testid="side-sash"]', -600);
    assert.equal(await width(page, ".middle > .side"), 180);
    assert.deepEqual(await audit(page), []);
    const before = await width(page, ".ecol");
    const agent = await width(page, ".agent");
    await page.click('[data-testid="agent-hide"]');
    await page.waitForSelector(".agent", { state: "detached" });
    const after = await width(page, ".ecol");
    assert.ok(after >= before + agent - 1, `the content grew by the agent's ${agent}px`);
    assert.ok(
      await page.$eval(".split.build > .side", (el) => el.scrollWidth <= el.clientWidth),
      "Build's list has no horizontal scroll",
    );
    assert.deepEqual(await audit(page), []);
  } finally {
    await close(s, page);
  }
});
