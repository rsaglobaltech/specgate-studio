/**
 * draft-settings in a real browser: `specgate-studio serve` with the UI
 * bundle, the host fed by fakes (REQ-141 … REQ-143). specgate's answers are
 * 0.34.0's: `config keys --json` (fixtures/config-keys-0.34.json), `config
 * list --json` and `config set --json` with `files`. The desktop scenarios run
 * the same bundle in the desktop app's webview (A11).
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { SpecgateAnswer } from "@specgate-studio/core";
import { close, open, studio, type Page, type StudioOptions } from "./support.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KEYS = JSON.parse(
  fs.readFileSync(
    [
      path.join(HERE, "..", "..", "..", "..", "packages/core/test/fixtures/config-keys-0.34.json"),
      path.join(HERE, "..", "..", "..", "packages/core/test/fixtures/config-keys-0.34.json"),
    ].find((p) => fs.existsSync(p))!,
    "utf8",
  ),
) as { keys: unknown[] };

/** The file specgate keeps each of sprich's settings in (specgate 0.34, REQ-505). */
const FILE: Record<string, string> = {
  agent_guard: ".specgate/config.json",
  "alm.provider": "alm.config.yaml",
  "alm.token_env": "alm.config.yaml",
};
const fileOf = (key: string) =>
  FILE[key] ?? (key.startsWith("profiles.") ? ".harness/profiles.yaml" : "harness.config.yaml");

/**
 * sprich as specgate answers it (A1): `npm test`, the agent, two profiles, the
 * ALM on jira, the guards on, quality basic. `config set` checks the agent as
 * specgate does, and writes the key in its file — specgate's write, never the
 * studio's — each line `key: "value"`.
 */
function sprich(): {
  answers: NonNullable<StudioOptions["specgate"]>;
  files: Record<string, string>;
} {
  const config: Record<string, unknown> = {
    test_cmd: "npm test",
    agent: "claude -p < {prompt_file}",
    agent_guard: "on",
    quality: "basic",
    "profiles.claude-sonnet.agent": "claude -p --model sonnet < {prompt_file}",
    "profiles.claude-sonnet.cost_per_run_hint": 0.4,
    "profiles.claude-opus.agent": "claude -p --model opus < {prompt_file}",
    "alm.provider": "jira",
    "alm.token_env": "JIRA_API_TOKEN",
  };
  const files = {
    "harness.config.yaml":
      'test_cmd: "npm test"\nagent: "claude -p < {prompt_file}"\nquality: "basic"\n',
    "spec.md": "# spec.md\n",
  };
  const list = (): SpecgateAnswer => ({
    data: {
      config: structuredClone(config),
      files: Object.fromEntries(Object.keys(config).map((k) => [k, fileOf(k)])),
    },
    findings: [],
    exitCode: 0,
  });
  const set =
    (key: string, value: string) =>
    (_: unknown, disk: Record<string, string>): SpecgateAnswer => {
      if (key === "agent" && !value.includes("{prompt_file}"))
        return {
          data: { config: null },
          findings: [
            {
              severity: "error",
              code: "config_value_invalid",
              message: "The agent command needs {prompt_file}: the prompt goes there.",
              fix: 'specgate config set agent "claude -p < {prompt_file}"',
            },
          ],
          exitCode: 2,
        };
      config[key] = value;
      const file = fileOf(key);
      const line = `${key}: ${JSON.stringify(value)}`;
      const lines = (disk[file] ?? "").split("\n").filter((l) => l && !l.startsWith(`${key}:`));
      disk[file] = [...lines, line].join("\n") + "\n";
      return {
        data: { config: { [key]: value }, files: { [key]: file } },
        findings: [],
        exitCode: 0,
      };
    };
  return {
    files,
    answers: {
      "config keys": { data: KEYS, findings: [], exitCode: 0 },
      "config list": () => list(),
      "config set test_cmd pnpm test": set("test_cmd", "pnpm test"),
      "config set agent claude -p": set("agent", "claude -p"),
      "config set quality strict": set("quality", "strict"),
      "config set agent_guard off": set("agent_guard", "off"),
    },
  };
}

const setting = (key: string) => `.setting[data-key="${key}"]`;
const textOf = async (page: Page, sel: string) =>
  ((await page.textContent(sel)) ?? "").replace(/\s+/g, " ").trim();

async function openSettings(page: Page) {
  await page.click('.sga[data-view="settings"]');
  await page.waitForSelector('.settings [data-scope="project"] .setting');
}

// ── REQ-141 ─────────────────────────────────────────────────────────────

test('REQ-141 SCN-421: "test" typed in the search box — Test command under Project with `npm test`, and nothing that lacks "test"', async () => {
  const { answers, files } = sprich();
  const s = await studio({ specgate: answers, files });
  const page = await open(s);
  try {
    await openSettings(page);
    // Two scopes, Project and User.
    assert.deepEqual(
      await page.$$eval('.settings [role="tab"]', (els) => els.map((e) => e.textContent)),
      ["Project", "User"],
    );
    await page.fill('.settings input[type="search"]', "test");
    await page.waitForFunction(() => !document.querySelector('[data-key="agent"]'));
    await page.waitForSelector(`[data-scope="project"] ${setting("test_cmd")}`);
    assert.equal(await page.textContent('[data-scope="project"] > h2'), "Project");
    assert.equal(await textOf(page, `${setting("test_cmd")} .setting-name`), "Test command");
    assert.equal(
      await page.$eval(`${setting("test_cmd")} input`, (e) => (e as HTMLInputElement).value),
      "npm test",
    );
    // Every setting left, in both scopes, says "test" in its name or description.
    const shown = await page.$$eval(".settings .setting", (els) =>
      els.map(
        (e) =>
          `${e.querySelector(".setting-name")?.textContent ?? ""} ${e.querySelector(".setting-desc")?.textContent ?? ""}`,
      ),
    );
    assert.ok(shown.length >= 1);
    for (const line of shown) assert.match(line, /test/i, line);
    assert.equal(await page.$('[data-key="theme"]'), null);
    // Read through specgate's catalog, never from its files (A6).
    assert.ok(s.calls.some((c) => c.join(" ") === "config keys"));
    assert.deepEqual(s.writes, []);
  } finally {
    await close(s, page);
  }
});

test("REQ-141 SCN-421: the search reads in the studio's language — «tema» finds Tema in Spanish", async () => {
  const { answers, files } = sprich();
  const s = await studio({ specgate: answers, files });
  const page = await open(s, { lang: "es" });
  try {
    await openSettings(page);
    await page.fill('.settings input[type="search"]', "tema");
    await page.waitForSelector(`[data-scope="user"] ${setting("theme")}`);
    await page.waitForFunction(() => !document.querySelector('[data-key="test_cmd"]'));
    assert.equal(await textOf(page, `${setting("theme")} .setting-name`), "Tema");
  } finally {
    await close(s, page);
  }
});

test("REQ-141 SCN-422: the User scope, the theme set to light — the studio turns light, the notice names the user settings file, no file of sprich changed", async () => {
  const { answers, files } = sprich();
  const s = await studio({ specgate: answers, files, user: { theme: "dark" } });
  const before = structuredClone(s.disk);
  const page = await open(s);
  try {
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
    await openSettings(page);
    await page.click('.settings [role="tab"]:has-text("User")');
    assert.equal(
      await page.getAttribute('.settings [role="tab"]:has-text("User")', "aria-selected"),
      "true",
    );
    await page.selectOption(`[data-scope="user"] select[aria-label="Theme"]`, "light");
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

// ── REQ-142 ─────────────────────────────────────────────────────────────

test("REQ-142 SCN-423: the test command saved as `pnpm test`, on the desktop — the command and harness.config.yaml shown before, the file written by specgate, the notice with `specgate check`", async () => {
  const { answers, files } = sprich();
  const s = await studio({ specgate: answers, files });
  const page = await open(s);
  try {
    await openSettings(page);
    const row = `[data-scope="project"] ${setting("test_cmd")}`;
    assert.equal(await textOf(page, `${row} .setting-where`), "harness.config.yaml · test_cmd");
    await page.fill(`${row} input`, "pnpm test");
    // Before saving: the command that saves it, and its file.
    assert.equal(
      await textOf(page, `${row} .setting-cmd`),
      'On save: specgate config set test_cmd "pnpm test" → harness.config.yaml',
    );
    assert.match(s.disk["harness.config.yaml"]!, /^test_cmd: "npm test"$/m);
    await page.click(`${row} button:has-text("Save")`);
    await page.waitForSelector('.notice[data-tone="ok"]');
    // specgate ran it, with its arguments as an array…
    assert.ok(s.calls.some((c) => JSON.stringify(c) === '["config","set","test_cmd","pnpm test"]'));
    // …and wrote the file; the studio wrote nothing itself.
    assert.match(s.disk["harness.config.yaml"]!, /^test_cmd: "pnpm test"$/m);
    assert.deepEqual(s.writes, []);
    const notice = await textOf(page, '.notice[data-tone="ok"]');
    assert.match(notice, /specgate config set test_cmd "pnpm test"/);
    assert.match(notice, /harness\.config\.yaml/);
    assert.match(notice, /specgate check/);
    // Read again: the value is specgate's now.
    await page.waitForFunction(
      (sel) => (document.querySelector(sel) as HTMLInputElement | null)?.value === "pnpm test",
      `${row} input`,
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-142 SCN-424: an agent without {prompt_file} refused, in the browser — specgate's `config_value_invalid` with its fix, harness.config.yaml unchanged", async () => {
  const { answers, files } = sprich();
  const s = await studio({ specgate: answers, files });
  const before = s.disk["harness.config.yaml"];
  const page = await open(s);
  try {
    await openSettings(page);
    const row = `[data-scope="project"] ${setting("agent")}`;
    await page.fill(`${row} input`, "claude -p");
    await page.click(`${row} button:has-text("Save")`);
    await page.waitForSelector(`${row} .setting-refused`);
    const refused = await textOf(page, `${row} .setting-refused`);
    assert.match(refused, /config_value_invalid/);
    assert.equal(
      await textOf(page, `${row} .setting-fix`),
      'specgate config set agent "claude -p < {prompt_file}"',
    );
    assert.match(refused, /harness\.config\.yaml is unchanged/);
    assert.equal(s.disk["harness.config.yaml"], before);
    assert.deepEqual(s.writes, []);
    // What was typed stays, to correct it.
    assert.equal(
      await page.$eval(`${row} input`, (e) => (e as HTMLInputElement).value),
      "claude -p",
    );
  } finally {
    await close(s, page);
  }
});

// ── REQ-143 ─────────────────────────────────────────────────────────────

test("REQ-143 SCN-425: the nine sections, on the desktop — in order, and under Agents and profiles the agent of harness.config.yaml and the profiles claude-sonnet and claude-opus", async () => {
  const { answers, files } = sprich();
  const s = await studio({ specgate: answers, files });
  const page = await open(s);
  try {
    await openSettings(page);
    assert.deepEqual(
      await page.$$eval(".settings .snav .tr .name", (els) => els.map((e) => e.textContent)),
      [
        "Agents and profiles",
        "Preferences",
        "Agent guards",
        "Quality",
        "ALM",
        "Editor",
        "Terminal",
        "Shortcuts",
        "Appearance",
      ],
    );
    const agents = '[data-section="agents"]';
    assert.equal(
      await page.$eval(`${agents} ${setting("agent")} input`, (e) => (e as HTMLInputElement).value),
      "claude -p < {prompt_file}",
    );
    assert.equal(
      await textOf(page, `${agents} ${setting("agent")} .setting-where`),
      "harness.config.yaml · agent",
    );
    assert.deepEqual(
      await page.$$eval(`${agents} .settings-group-h`, (els) => els.map((e) => e.textContent)),
      ["claude-sonnet", "claude-opus"],
    );
    assert.equal(
      await textOf(page, `${setting("profiles.claude-opus.agent")} .setting-where`),
      ".harness/profiles.yaml · profiles.<name>.agent",
    );
    // The user's four sections are under User.
    await page.click('.settings .snav .tr[data-section="shortcuts"]');
    await page.waitForSelector('[data-scope="user"] [data-section="shortcuts"] .setting-keys');
    assert.deepEqual(
      await page.$$eval('[data-scope="user"] .settings-section', (els) =>
        els.map((e) => e.getAttribute("data-section")),
      ),
      ["editor", "terminal", "shortcuts", "appearance"],
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-143 SCN-426: ALM names the token's variable, never its value, in the browser — jira, from JIRA_API_TOKEN, set", async () => {
  const token = "jira-secret-7c41d0e9";
  const was = process.env.JIRA_API_TOKEN;
  process.env.JIRA_API_TOKEN = token;
  const { answers, files } = sprich();
  const s = await studio({ specgate: answers, files });
  const page = await open(s);
  try {
    await openSettings(page);
    await page.click('.settings .snav .tr[data-section="alm"]');
    const alm = '[data-section="alm"]';
    assert.equal(
      await page.$eval(
        `${alm} ${setting("alm.provider")} input`,
        (e) => (e as HTMLInputElement).value,
      ),
      "jira",
    );
    const env = `${alm} ${setting("alm.token_env")} .setting-env`;
    assert.equal(await page.getAttribute(env, "data-env"), "JIRA_API_TOKEN");
    assert.equal(await page.getAttribute(env, "data-set"), "true");
    assert.match(await textOf(page, env), /JIRA_API_TOKEN, set/);
    // No part of the token's value, anywhere on the page.
    const html = await page.content();
    for (const part of [token, token.slice(0, 8), token.slice(-8)])
      assert.ok(!html.includes(part), part);
  } finally {
    if (was === undefined) delete process.env.JIRA_API_TOKEN;
    else process.env.JIRA_API_TOKEN = was;
    await close(s, page);
  }
});

test('REQ-143 SCN-427: Agent guards, on the desktop — on, beside `specgate config set agent_guard off` and .specgate/config.json, and the "?" that says what they refuse', async () => {
  const { answers, files } = sprich();
  const s = await studio({ specgate: answers, files });
  const page = await open(s);
  try {
    await openSettings(page);
    await page.click('.settings .snav .tr[data-section="guards"]');
    const row = `[data-section="guards"] ${setting("agent_guard")}`;
    assert.equal(await page.$eval(`${row} select`, (e) => (e as HTMLSelectElement).value), "on");
    assert.equal(
      await textOf(page, `${row} .setting-cmd`),
      "Saved with specgate config set agent_guard off → .specgate/config.json",
    );
    await page.click(`${row} .hq`);
    await page.waitForSelector('.help.popover section[data-action="agent-guard"]');
    const help = await textOf(page, ".help.popover");
    assert.match(help, /refuse an edit to source code until a test names the requirement/);
    assert.match(help, /specgate config set agent_guard off/);
    assert.match(help, /\.specgate\/config\.json/);
    assert.deepEqual(s.runs, [], 'the "?" runs nothing');
  } finally {
    await close(s, page);
  }
});

test("REQ-143 SCN-428: Quality saved through specgate, in the browser — basic to strict, the command and harness.config.yaml before, the notice with `specgate check`", async () => {
  const { answers, files } = sprich();
  const s = await studio({ specgate: answers, files });
  const page = await open(s);
  try {
    await openSettings(page);
    await page.click('.settings .snav .tr[data-section="quality"]');
    const row = `[data-section="quality"] ${setting("quality")}`;
    assert.equal(await page.$eval(`${row} select`, (e) => (e as HTMLSelectElement).value), "basic");
    await page.selectOption(`${row} select`, "strict");
    assert.equal(
      await textOf(page, `${row} .setting-cmd`),
      "On save: specgate config set quality strict → harness.config.yaml",
    );
    await page.click(`${row} button:has-text("Save")`);
    await page.waitForSelector('.notice[data-tone="ok"]');
    assert.ok(s.calls.some((c) => c.join(" ") === "config set quality strict"));
    assert.match(s.disk["harness.config.yaml"]!, /^quality: "strict"$/m);
    assert.deepEqual(s.writes, []);
    const notice = await textOf(page, '.notice[data-tone="ok"]');
    assert.match(notice, /specgate config set quality strict/);
    assert.match(notice, /harness\.config\.yaml/);
    assert.match(notice, /specgate check/);
  } finally {
    await close(s, page);
  }
});

test("REQ-143: the editor's font size chosen under User is kept in the user's file, nothing of the project written", async () => {
  const { answers, files } = sprich();
  const s = await studio({ specgate: answers, files });
  const page = await open(s, { lang: "es" });
  try {
    await openSettings(page);
    await page.click('.settings .snav .tr[data-section="editor"]');
    await page.selectOption(`[data-section="editor"] ${setting("editor.fontSize")} select`, "16");
    await page.waitForSelector('.notice[data-tone="ok"]');
    assert.deepEqual(await s.userSettings.read(), { "editor.fontSize": "16" });
    assert.deepEqual(s.writes, []);
  } finally {
    await close(s, page);
  }
});
