/**
 * draft-settings in a real browser: `specgate-studio serve` with the UI
 * bundle, the host fed by fakes (REQ-141). The desktop scenarios run the same
 * bundle; the Tauri window comes with phase 3.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { close, open, studio } from "./support.js";

const CONFIG = {
  "config list": {
    data: { config: { test_cmd: "npm test", agent: "claude -p < {prompt_file}" } },
    findings: [],
    exitCode: 0,
  },
};

// ── REQ-141 ─────────────────────────────────────────────────────────────

test('REQ-141 SCN-421: "test" typed in the search box — Test command under Project with `npm test`, and nothing that lacks "test"', async () => {
  const s = await studio({ specgate: CONFIG });
  const page = await open(s);
  try {
    await page.click('.sga[data-view="settings"]');
    // Two scopes, Project and User.
    assert.deepEqual(
      await page.$$eval('.settings [role="tab"]', (els) => els.map((e) => e.textContent)),
      ["Project", "User"],
    );
    await page.fill('.settings input[type="search"]', "test");
    await page.waitForSelector('[data-scope="project"] [data-key="test_cmd"]');
    assert.equal(await page.textContent('[data-scope="project"] h2'), "Project");
    assert.equal(
      await page.textContent('[data-scope="project"] [data-key="test_cmd"] .setting-name'),
      "Test command",
    );
    assert.equal(
      await page.$eval(
        '[data-scope="project"] [data-key="test_cmd"] input',
        (e) => (e as HTMLInputElement).value,
      ),
      "npm test",
    );
    // Every setting left, in both scopes, says "test" in its name or description.
    await page.waitForFunction(() => !document.querySelector('[data-key="theme"]'));
    const shown = await page.$$eval(".settings .setting", (els) =>
      els.map(
        (e) =>
          `${e.querySelector(".setting-name")?.textContent ?? ""} ${e.querySelector(".setting-desc")?.textContent ?? ""}`,
      ),
    );
    assert.ok(shown.length >= 1);
    for (const line of shown) assert.match(line, /test/i, line);
    assert.equal(await page.$('[data-key="agent"]'), null, "the agent lacks it");
    // Read through specgate, never from its files (A6).
    assert.ok(s.calls.some((c) => c.join(" ") === "config list"));
  } finally {
    await close(s, page);
  }
});

test("REQ-141 SCN-421: the search reads in the studio's language — «tema» finds Tema in Spanish", async () => {
  const s = await studio({ specgate: CONFIG });
  const page = await open(s, { lang: "es" });
  try {
    await page.click('.sga[data-view="settings"]');
    await page.fill('.settings input[type="search"]', "tema");
    await page.waitForSelector('[data-scope="user"] [data-key="theme"]');
    await page.waitForFunction(() => !document.querySelector('[data-key="test_cmd"]'));
    assert.equal(
      await page.textContent('[data-scope="user"] [data-key="theme"] .setting-name'),
      "Tema",
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-141 SCN-422: the User scope, the theme set to light — the studio turns light, the notice names the user settings file, no file of sprich changed", async () => {
  const s = await studio({ specgate: CONFIG, user: { theme: "dark" } });
  const before = structuredClone(s.disk);
  const page = await open(s);
  try {
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
    await page.click('.sga[data-view="settings"]');
    await page.click('.settings [role="tab"]:has-text("User")');
    assert.equal(
      await page.getAttribute('.settings [role="tab"]:has-text("User")', "aria-selected"),
      "true",
    );
    await page.selectOption('[data-scope="user"] select[aria-label="Theme"]', "light");
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "light");
    await page.waitForSelector('.notice[data-tone="ok"]');
    const notice = (await page.textContent('.notice[data-tone="ok"]')) ?? "";
    assert.ok(notice.includes(s.userSettings.file), notice);
    // Written in the Developer's own file…
    assert.deepEqual(await s.userSettings.read(), { theme: "light" });
    // …and nothing of sprich: no file written, no specgate command run.
    assert.deepEqual(s.writes, []);
    assert.deepEqual(s.disk, before);
    assert.deepEqual(s.runs, []);
    assert.ok(s.calls.every((c) => c[0] !== "config" || c[1] !== "set"));
  } finally {
    await close(s, page);
  }
});

test("REQ-141: a user setting applies to every project — a page opened later reads the theme from the user settings file", async () => {
  const s = await studio({ user: { theme: "light" } });
  const page = await open(s);
  try {
    await page.waitForFunction(() => document.documentElement.dataset.theme === "light");
  } finally {
    await close(s, page);
  }
});
