/**
 * specgate-1-4-setup in a real browser, on folders the real specgate 1.4
 * adopted: an undecided stack on Home and in the readiness list (REQ-228),
 * stack and testing in Settings (REQ-229), and the adoption baseline left out
 * of Home's counters (REQ-230). The desktop app runs this same UI over the
 * same host (draft-core-host Q1).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { adopted } from "@specgate-studio/adapter-specgate-cli/testing";
import { specgateBin } from "@specgate-studio/adapter-specgate-cli";
import { serve } from "../src/index.js";
import { close, open, untilTerm, type Page } from "./support.js";

/** Removes a test's folder, retrying what Windows still holds a moment. */
async function remove(dir: string): Promise<void> {
  for (let i = 0; ; i++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return;
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (i >= 60 || !["EBUSY", "EPERM", "ENOTEMPTY"].includes(code ?? "")) throw e;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

const SLOW = { timeout: 180_000 };

async function studioOn(dir: string) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "sg-setup-home-"));
  const host = await serve({ projectDir: dir, port: 0, home });
  return {
    host,
    url: host.url.replace(/^ws/, "http"),
    done: async (page?: Page) => {
      await close({ host }, page);
      await remove(home);
    },
  };
}

const text = async (page: Page, sel: string) =>
  ((await page.textContent(sel)) ?? "").replace(/\s+/g, " ").trim();

test(
  "REQ-228 SCN-1002 SCN-1003, REQ-230 SCN-1007: notes, an empty folder adopted — its baseline counts, Decide the stack, the stack set from the readiness list",
  SLOW,
  async () => {
    const dir = adopted("notes", { code: false });
    assert.match(fs.readFileSync(path.join(dir, "AGENTS.md"), "utf8"), /Stack: TBD/);
    const s = await studioOn(dir);
    const page = await open(s);
    try {
      // SCN-1007: "Build and test the project" counts as any requirement.
      await page.waitForSelector('[data-testid="next-title"]', SLOW);
      assert.equal(await text(page, ".cards .card .v"), "1");
      assert.equal(await page.$('[data-testid="home-baseline"]'), null);

      // SCN-1002: the next step is to decide the stack; the readiness list says what.
      assert.equal(await text(page, '[data-testid="next-title"]'), "Decide the stack");
      await page.click('[data-testid="next-go"]');
      await page.waitForSelector('[data-ready="stack"]', SLOW);
      // The project exists: what is ready, not "Create the project".
      assert.equal(await text(page, "h1"), "What is ready");
      for (const id of ["stack", "testing"]) {
        const row = `[data-ready="${id}"]`;
        assert.equal(await page.getAttribute(row, "data-undecided"), "true", id);
        assert.match(await text(page, row), /to decide/);
        assert.ok(await page.$(`${row} input`), `${id} has a field`);
      }

      // SCN-1003: decided from its field; specgate writes AGENTS.md.
      await page.getByLabel("Stack: the value").fill("TypeScript, Node 22");
      await page.click('[data-ready="stack"] .btn');
      await untilTerm(page, "specgate", /specgate config set stack /, 60_000);
      await page.waitForSelector('[data-ready="stack"][data-set="true"]', SLOW);
      assert.match(await text(page, '[data-ready="stack"]'), /TypeScript, Node 22/);
      assert.match(
        fs.readFileSync(path.join(dir, "AGENTS.md"), "utf8"),
        /Stack: TypeScript, Node 22/,
      );
      // Testing still to decide.
      assert.equal(await page.getAttribute('[data-ready="testing"]', "data-undecided"), "true");
    } finally {
      await s.done(page);
      await remove(path.dirname(dir));
    }
  },
);

test(
  "REQ-228 SCN-1004, REQ-230 SCN-1006: shop, adopted with its code — the stack detected, REQ-001 not counted and said so",
  SLOW,
  async () => {
    const dir = adopted("shop", { code: true });
    const s = await studioOn(dir);
    const page = await open(s);
    try {
      // SCN-1006: 0 requirements, 0 to do; below, the baseline a test closes.
      await page.waitForSelector('[data-testid="home-baseline"]', SLOW);
      assert.equal(await text(page, ".cards .card .v"), "0");
      assert.match(await text(page, ".cards .card .sub"), /0 to do/);
      assert.equal(await page.getAttribute('[data-testid="home-baseline"]', "data-req"), "REQ-001");
      assert.match(
        await text(page, '[data-testid="home-baseline"]'),
        /REQ-001.*a test that names it/,
      );

      // SCN-1004: no stack to decide on Home.
      assert.equal(await page.$('[data-next="stack"]'), null);
      assert.notEqual(await page.$('[data-next="specify"]'), null);
    } finally {
      await s.done(page);
      await remove(path.dirname(dir));
    }
  },
);

test(
  "REQ-229 SCN-1005: the stack read in Settings, on the desktop — Stack with TypeScript 5 under Preferences, kept in AGENTS.md",
  SLOW,
  async () => {
    const dir = adopted("sprich", { code: true });
    const set = spawnSync(
      process.execPath,
      [specgateBin(), "config", "set", "stack", "TypeScript 5"],
      {
        cwd: dir,
        encoding: "utf8",
      },
    );
    assert.equal(set.status, 0, set.stdout + set.stderr);
    const s = await studioOn(dir);
    const page = await open(s);
    try {
      await page.click('.sga[data-view="settings"]');
      await page.waitForSelector('.settings [data-scope="project"] .setting', SLOW);
      await page.click('.settings .snav .tr[data-section="preferences"]');
      const row = '[data-section="preferences"] .setting[data-key="stack"]';
      await page.waitForSelector(row);
      assert.equal(await text(page, `${row} .setting-name`), "Stack");
      assert.equal(await text(page, `${row} .setting-where`), "AGENTS.md · stack");
      assert.equal(
        await page.$eval(`${row} input`, (e) => (e as HTMLInputElement).value),
        "TypeScript 5",
      );
      await page.fill(`${row} input`, "TypeScript 5.6");
      assert.match(
        await text(page, `${row} .setting-cmd`),
        /specgate config set stack "TypeScript 5.6"/,
      );
      assert.notEqual(
        await page.$('[data-section="preferences"] .setting[data-key="testing"]'),
        null,
      );
    } finally {
      await s.done(page);
      await remove(path.dirname(dir));
    }
  },
);
