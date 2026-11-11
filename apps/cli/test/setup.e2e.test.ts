/**
 * draft-project-setup in a real browser, on real folders and the real
 * specgate: Home leads an empty folder to its five questions and `specgate
 * init` (REQ-111, REQ-116), a folder with code to the adoption's preview, the
 * adoption, what is ready (REQ-112 … REQ-114) and the areas it found (REQ-115).
 * The desktop app runs this same UI over the same host (draft-core-host Q1).
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { codeFolder, snapshot, withClaude } from "@specgate-studio/adapter-specgate-cli/testing";
import { serve } from "../src/index.js";
import { close, open, studio, untilTerm, type Page } from "./support.js";

/** On Windows a shell or watcher of the folder lets go of it a moment after the host closes. */
const RM = { recursive: true, force: true, maxRetries: 20, retryDelay: 250 } as const;

/** Long enough for the real specgate on a loaded Windows runner. */
const SLOW = { timeout: 180_000 };

/** `specgate-studio serve` on a folder, with a settings folder of its own. */
async function studioOn(dir: string) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "sg-setup-home-"));
  const host = await serve({ projectDir: dir, port: 0, home });
  return {
    host,
    url: host.url.replace(/^ws/, "http"),
    done: async (page?: Page) => {
      await close({ host }, page);
      fs.rmSync(home, RM);
    },
  };
}

const text = (page: Page, sel: string) => page.$eval(sel, (e) => e.textContent ?? "");

test(
  "REQ-116 REQ-111 SCN-342 SCN-332 SCN-331: the empty academia — Home says Create the project, the five questions make the init shown before anything is written, Create puts the project in the folder itself",
  SLOW,
  async () => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), "sg-setup-"));
    const dir = path.join(parent, "academia");
    fs.mkdirSync(dir);
    const s = await studioOn(dir);
    const page = await open(s);
    try {
      // SCN-342: the next step, and it opens the five questions.
      await page.waitForSelector("[data-setup-next]");
      assert.equal(await text(page, "[data-setup-next]"), "Create the project");
      assert.equal(await page.$('[data-setup-next="adopt"]'), null);
      await page.click("[data-setup-next]");
      await page.getByLabel("Project name").fill("academia");
      await page.getByLabel("What it is").selectOption("web");
      await page.getByLabel("Stack").selectOption("node-react");
      await page.getByLabel("Agent that builds it").selectOption("claude");
      await page.getByLabel("Architecture").selectOption("minimal");

      // SCN-332: the command those answers make, a Create button, the folder still empty.
      await page.waitForFunction(() =>
        [...document.querySelectorAll(".setup-cmd")].some(
          (e) => e.textContent === "specgate init --config academia.yaml --yes",
        ),
      );
      const config = await text(page, ".setup-config");
      assert.match(config, /PROJECT_NAME: "academia"/);
      assert.match(config, /PROJECT_TYPE: "frontend"/);
      assert.match(config, /STACK: "Node.js, React, TypeScript"/);
      assert.match(config, /ARCHITECTURE: "minimal"/);
      assert.match(await text(page, ".setup"), /specgate agents init --tool claude/);
      assert.equal(await text(page, '[data-setup="create"]'), "Create");
      assert.deepEqual(fs.readdirSync(dir), [], "nothing written before Create");

      // SCN-331: init runs in the studio's terminal; the project is the folder itself.
      await page.click('[data-setup="create"]');
      // The config's path is the studio's temporary folder: quoted on Windows, and long enough to wrap.
      await untilTerm(page, "specgate", /▶ "Create" · specgate init --config /, 120_000);
      await page.waitForSelector('[data-ready="agent"][data-set="true"]', SLOW);
      assert.ok(fs.existsSync(path.join(dir, "spec.md")));
      assert.ok(fs.existsSync(path.join(dir, "docs", "specs", "traceability.md")));
      assert.ok(!fs.existsSync(path.join(dir, "academia")), "no academia folder inside it");
      assert.match(await text(page, '[data-ready="agent"]'), /Claude Code/);
    } finally {
      await s.done(page);
      fs.rmSync(parent, RM);
    }
  },
);

test(
  "REQ-116 REQ-112 REQ-113 REQ-114 REQ-115 SCN-341 SCN-333 SCN-335 SCN-334 SCN-337 SCN-339: shop — Adopt this folder, its preview with npm test and Claude Code, adopted with its code untouched, ready but for the architecture, then its areas",
  SLOW,
  async () => {
    const dir = codeFolder("shop", ["billing", "invoices", "utils"], { tests: true });
    const claude = withClaude(true);
    const s = await studioOn(dir);
    const page = await open(s);
    try {
      // SCN-341: the next step reads Adopt this folder, and opens the preview.
      await page.waitForSelector("[data-setup-next]");
      assert.equal(await text(page, "[data-setup-next]"), "Adopt this folder");
      const before = snapshot(dir);
      await page.click("[data-setup-next]");

      // SCN-333: the files adoption writes; nothing written yet.
      await page.waitForSelector(".setup-files li");
      const files = await page.$$eval(".setup-files li", (els) => els.map((e) => e.textContent));
      for (const f of [
        "spec.md",
        "AGENTS.md",
        "features/adoption/baseline.feature",
        "docs/specs/traceability.md",
      ])
        assert.ok(files.includes(f), `${f} in ${files.join(", ")}`);
      // SCN-335: what it saves in harness.config.yaml, beside the files.
      assert.ok(files.includes("harness.config.yaml"));
      assert.match(await text(page, '[data-setting="test_cmd"]'), /test_cmd: npm test/);
      assert.match(await text(page, '[data-setting="agent"]'), /Claude Code/);
      await untilTerm(page, "specgate", /specgate adopt --dry-run/, 60_000);
      assert.deepEqual([...snapshot(dir).keys()], [...before.keys()], "the preview wrote nothing");

      // SCN-334: adopted; the preview's files exist, shop's own byte for byte.
      await page.click('[data-setup="adopt"]');
      await page.waitForSelector('[data-ready="tests"]', SLOW);
      for (const f of files) assert.ok(fs.existsSync(path.join(dir, f)), f);
      const after = snapshot(dir);
      for (const [f, bytes] of before) assert.ok(after.get(f)?.equals(bytes), `${f} unchanged`);

      // SCN-337: what is ready, and the architecture check set from its button.
      assert.match(await text(page, '[data-ready="tests"]'), /npm test/);
      assert.match(await text(page, '[data-ready="agent"]'), /Claude Code/);
      assert.match(await text(page, '[data-ready="ci"]'), /\.github\/workflows\/spec-gate\.yml/);
      assert.equal(await page.getAttribute('[data-ready="architecture"]', "data-set"), "false");
      await page.getByLabel("Architecture: the command").fill("npm run arch");
      await page.click('[data-ready="architecture"] .btn');
      await untilTerm(page, "specgate", /specgate config set arch_cmd 'npm run arch'/, 60_000);
      await page.waitForSelector('[data-ready="architecture"][data-set="true"]', SLOW);
      assert.match(await text(page, '[data-ready="architecture"]'), /npm run arch/);

      // SCN-339: Home — Billing and Invoices with their folders, not Utils; REQ-001 alone.
      await page.click('[data-setup="home"]');
      await page.waitForSelector("[data-area]", SLOW);
      const areas = await page.$$eval("[data-area]", (els) => els.map((e) => e.textContent));
      assert.equal(areas.length, 2);
      assert.match(areas[0]!, /Billing.*src\/billing/);
      assert.match(areas[1]!, /Invoices.*src\/invoices/);
      assert.equal(await page.$('[data-area="Utils"]'), null);
      assert.equal(await text(page, ".cards .card .v"), "1");
      assert.match(await text(page, '[data-next="specify"]'), /Specify a behaviour you rely on/);
    } finally {
      await s.done(page);
      claude.restore();
      fs.rmSync(path.dirname(dir), RM);
    }
  },
);

test(
  "REQ-113 REQ-114 SCN-336 SCN-338: shop with no test and no Claude Code — the preview says no test command, and the agent is set from the readiness list",
  SLOW,
  async () => {
    const dir = codeFolder("shop", ["billing"]);
    const claude = withClaude(false);
    const s = await studioOn(dir);
    const page = await open(s);
    try {
      await page.click("[data-setup-next]");
      // SCN-336: no test command, because no test was found yet, and how to set one later.
      await page.waitForSelector('[data-setting="test_cmd"]');
      const said = await text(page, '[data-setting="test_cmd"]');
      assert.match(said, /No test command will be saved: no test was found yet/);
      assert.match(said, /specgate config set test_cmd "<command>"/);

      // SCN-338: adopted with no agent; its button runs `agents init --tool claude`.
      await page.click('[data-setup="adopt"]');
      await page.waitForSelector('[data-ready="agent"][data-set="false"]', SLOW);
      await page.getByLabel("Agent that builds it").selectOption("claude");
      await page.click('[data-ready="agent"] .btn');
      await untilTerm(page, "specgate", /specgate agents init --tool claude/, 60_000);
      await page.waitForSelector('[data-ready="agent"][data-set="true"]', SLOW);
      assert.match(await text(page, '[data-ready="agent"]'), /Claude Code/);
    } finally {
      await s.done(page);
      claude.restore();
      fs.rmSync(path.dirname(dir), RM);
    }
  },
);

test(
  "REQ-115 SCN-340: a React app organised by kind — adopted, Home shows no area, says why, and the next step",
  SLOW,
  async () => {
    const dir = codeFolder("react-app", ["components", "hooks", "utils"], { tests: true });
    const s = await studioOn(dir);
    const page = await open(s);
    try {
      await page.click("[data-setup-next]");
      await page.click('[data-setup="adopt"]');
      await page.waitForSelector('[data-setup="home"]', SLOW);
      await page.click('[data-setup="home"]');
      await page.waitForSelector('[data-by-kind="true"]', SLOW);
      assert.match(await text(page, ".setup-areas"), /organised by kind of code/);
      assert.equal(await page.$("[data-area]"), null);
      assert.match(await text(page, '[data-next="specify"]'), /Specify a behaviour you rely on/);
    } finally {
      await s.done(page);
      fs.rmSync(path.dirname(dir), RM);
    }
  },
);

test("REQ-116: a specgate project's Home offers neither Create the project nor Adopt this folder", async () => {
  const s = await studio({ next: "specgate apply REQ-031" });
  const page = await open(s);
  try {
    await page.waitForFunction(
      () => document.querySelector(".next .mono")?.textContent === "specgate apply REQ-031",
    );
    assert.equal(await page.$("[data-setup-next]"), null);
    assert.doesNotMatch(await text(page, "body"), /Create the project|Adopt this folder/);
  } finally {
    await close(s, page);
  }
});
