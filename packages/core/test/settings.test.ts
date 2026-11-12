/**
 * draft-settings REQ-141 … REQ-143: the settings editor as the core answers
 * it — the project's settings from specgate's catalog (`config keys --json`,
 * fixtures/config-keys-0.34.json as specgate 0.34.0 answers it) and the values
 * set (`config list --json` with `files`), the user's in the Developer's own
 * file; nine sections, two scopes, a search in the studio's language.
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Commands,
  InMemoryUserSettings,
  SETTING_SECTIONS,
  SECTION_NAMES,
  SECTION_SCOPE,
  Settings,
  catalogOf,
  commandLine,
  configSetLine,
  searchSettings,
  type Notice,
  type ProcessRunner,
  type Setting,
  type SpecgateAnswer,
} from "../src/index.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KEYS = JSON.parse(
  fs.readFileSync(
    [
      path.join(HERE, "fixtures", "config-keys-0.34.json"),
      path.join(HERE, "..", "..", "test", "fixtures", "config-keys-0.34.json"),
    ].find((p) => fs.existsSync(p))!,
    "utf8",
  ),
) as { keys: unknown[] };

/** sprich (A1): npm test, two profiles, the ALM on jira with its token's variable, the guards on, quality basic. */
const SPRICH_CONFIG = {
  config: {
    test_cmd: "npm test",
    agent: "claude -p < {prompt_file}",
    agent_guard: "on",
    quality: "basic",
    "profiles.claude-sonnet.agent": "claude -p --model sonnet < {prompt_file}",
    "profiles.claude-sonnet.cost_per_run_hint": 0.4,
    "profiles.claude-opus.agent": "claude -p --model opus < {prompt_file}",
    "alm.provider": "jira",
    "alm.token_env": "JIRA_API_TOKEN",
  },
  files: {
    test_cmd: "harness.config.yaml",
    agent: "harness.config.yaml",
    agent_guard: ".specgate/config.json",
    quality: "harness.config.yaml",
    "profiles.claude-sonnet.agent": ".harness/profiles.yaml",
    "profiles.claude-sonnet.cost_per_run_hint": ".harness/profiles.yaml",
    "profiles.claude-opus.agent": ".harness/profiles.yaml",
    "alm.provider": "alm.config.yaml",
    "alm.token_env": "alm.config.yaml",
  },
};

const sprich = (list: unknown = SPRICH_CONFIG) => {
  const calls: string[][] = [];
  return {
    calls,
    specgate: {
      call: async (args: readonly string[]): Promise<SpecgateAnswer> => {
        calls.push([...args]);
        const key = args.join(" ");
        if (key === "config keys") return { data: KEYS, findings: [], exitCode: 0 };
        if (key === "config list") return { data: list, findings: [], exitCode: 0 };
        throw new Error(`no answer for ${key}`);
      },
    },
  };
};
const USER_FILE = "/home/dev/.config/specgate-studio/settings.json";
const find = (all: Setting[], key: string) => all.find((s) => s.key === key);

// ── REQ-141 ─────────────────────────────────────────────────────────────

test("REQ-141: every setting has one scope, one section, a name and a description in English and Spanish", async () => {
  const { specgate } = sprich();
  const view = await new Settings({ specgate, user: new InMemoryUserSettings(USER_FILE) }).view(
    "",
    "en",
  );
  assert.equal(view.catalog, true);
  for (const s of view.settings) {
    assert.ok(s.scope === "project" || s.scope === "user", s.key);
    assert.equal(s.scope, SECTION_SCOPE[s.section], `${s.key} is in a ${s.scope} section`);
    for (const lang of ["en", "es"] as const) assert.ok(s.name[lang].trim(), `${s.key} ${lang}`);
    if (!s.readOnly)
      for (const lang of ["en", "es"] as const)
        assert.ok(s.description[lang].trim(), `${s.key} ${lang}`);
  }
  // Every key of specgate's catalog that is no template is there, once.
  const plain = catalogOf(KEYS)!.filter((k) => !k.key.includes("<name>"));
  for (const k of plain)
    assert.equal(view.settings.filter((s) => s.key === k.key).length, 1, k.key);
});

test('REQ-141 SCN-421: "test" keeps, in both scopes, only what says test — Test command under Project with `npm test`', async () => {
  const { specgate, calls } = sprich();
  const user = new InMemoryUserSettings(USER_FILE, { theme: "light" });
  const view = await new Settings({ specgate, user }).view("test", "en");
  // Read through specgate, never from its files (A6).
  assert.deepEqual(
    calls.map((c) => c.join(" ")),
    ["config keys", "config list"],
  );
  assert.equal(view.userFile, USER_FILE);
  const t = find(view.settings, "test_cmd");
  assert.equal(t?.scope, "project");
  assert.equal(t?.name.en, "Test command");
  assert.equal(t?.value, "npm test");
  for (const s of view.settings)
    assert.match(`${s.name.en} ${s.description.en}`, /test/i, `${s.key} lacks "test"`);
  assert.ok(!find(view.settings, "theme"));
  // Empty keeps everything; case does not matter.
  const all = await new Settings({ specgate, user }).view("  ", "en");
  assert.equal(find(all.settings, "theme")?.value, "light");
  assert.equal(find(all.settings, "arch_cmd")?.value, null);
  assert.deepEqual(
    searchSettings(all.settings, "TEST COMMAND", "en").map((s) => s.key),
    ["test_cmd"],
  );
});

test("REQ-141: the search reads in the studio's language, without accents", async () => {
  const { specgate } = sprich();
  const all = (await new Settings({ specgate }).view("", "es")).settings;
  assert.deepEqual(
    searchSettings(all, "tema", "es").map((s) => s.key),
    ["theme"],
  );
  assert.deepEqual(searchSettings(all, "tema", "en"), []);
  assert.deepEqual(
    searchSettings(all, "idioma de la spec", "es").map((s) => s.key),
    ["language"],
  );
  // «proteccion» finds «Protecciones del agente».
  assert.ok(searchSettings(all, "proteccion", "es").some((s) => s.key === "agent_guard"));
});

test("REQ-141 SCN-422: a user setting is written to the user's file only, and the notice names it", async () => {
  const { specgate, calls } = sprich();
  const user = new InMemoryUserSettings(USER_FILE, { theme: "dark", lang: "en" });
  const r = await new Settings({ specgate, user }).setUser("theme", "light");
  assert.equal(r.ok, true);
  assert.deepEqual(await user.read(), { theme: "light", lang: "en" });
  assert.deepEqual(calls, [], "specgate is not run: nothing of the project is written");
  if (!r.ok) return;
  for (const lang of ["en", "es"] as const) {
    assert.equal(r.notice[lang].tone, "ok");
    assert.ok(`${r.notice[lang].ran} ${r.notice[lang].wrote}`.includes(user.file));
  }
});

test("REQ-141: a project setting, an unknown key, a shortcut or a value not offered is not a user setting", async () => {
  const user = new InMemoryUserSettings("/u/settings.json");
  const settings = new Settings({ user });
  for (const [k, v] of [
    ["test_cmd", "pnpm test"],
    ["nope", "x"],
    ["theme", "pink"],
    ["lang", 3],
    ["shortcut.save", "Mod+S"],
  ] as const) {
    const r = await settings.setUser(k, v);
    assert.equal(r.ok, false, `${k}=${v}`);
  }
  assert.deepEqual(await user.read(), {});
  assert.equal((await settings.setUser("editor.fontSize", "15")).ok, true);
});

test("REQ-141: specgate not answering shows no project setting, never a guessed one; the user scope still read", async () => {
  const user = new InMemoryUserSettings("/u/settings.json", { lang: "es" });
  const view = await new Settings({
    specgate: { call: async () => Promise.reject(new Error("no specgate")) },
    user,
  }).view("", "en");
  assert.equal(view.catalog, false);
  assert.ok(view.settings.every((s) => s.scope === "user"));
  assert.equal(find(view.settings, "lang")?.value, "es");
});

// ── REQ-142 ─────────────────────────────────────────────────────────────

test("REQ-142 SCN-423: each project setting names the file specgate keeps it in, and the command that saves it", async () => {
  const { specgate } = sprich();
  const all = (await new Settings({ specgate }).view("", "en")).settings;
  assert.equal(find(all, "test_cmd")?.file, "harness.config.yaml");
  assert.equal(find(all, "agent_guard")?.file, ".specgate/config.json");
  assert.equal(find(all, "alm.provider")?.file, "alm.config.yaml");
  assert.equal(find(all, "profiles.claude-opus.agent")?.file, ".harness/profiles.yaml");
  for (const s of all.filter((x) => x.scope === "project")) assert.ok(s.file, s.key);
  for (const s of all.filter((x) => x.scope === "user")) assert.equal(s.file, null, s.key);
  assert.equal(configSetLine("test_cmd", "pnpm test"), 'specgate config set test_cmd "pnpm test"');
  assert.equal(configSetLine("agent_guard", "off"), "specgate config set agent_guard off");
  assert.equal(
    configSetLine("agent", "claude -p < {prompt_file}"),
    'specgate config set agent "claude -p < {prompt_file}"',
  );
});

test("REQ-142 SCN-423: Save runs `config set` with its arguments as an array, and the notice names the command, the file and `specgate check`", async () => {
  const asked: string[][] = [];
  const runner: ProcessRunner = {
    run: async () => assert.fail("no process outside specgate's port"),
  };
  const commands = new Commands(runner, {
    json: {
      call: async (args) => {
        asked.push([...args]);
        return {
          data: { config: { test_cmd: "pnpm test" }, files: { test_cmd: "harness.config.yaml" } },
          findings: [],
          exitCode: 0,
        };
      },
    },
  });
  let notice: Record<"en" | "es", Notice> | undefined;
  commands.onEvent((e) => {
    if (e.type === "ended" && e.notice) notice = e.notice;
  });
  const r = await commands.run({ name: "settings-save", key: "test_cmd", value: "pnpm test" });
  assert.deepEqual(asked, [["config", "set", "test_cmd", "pnpm test"]]);
  assert.ok(r.ok && r.exitCode === 0);
  assert.deepEqual(r.ok && r.written, ["harness.config.yaml"]);
  for (const lang of ["en", "es"] as const) {
    assert.equal(notice?.[lang].tone, "ok");
    assert.match(notice![lang].ran, /specgate config set test_cmd "pnpm test"/);
    assert.match(notice![lang].wrote, /harness\.config\.yaml/);
    assert.equal(notice![lang].next, "specgate check");
  }
});

test("REQ-142 SCN-424: a value specgate refuses shows its code and fix, and writes nothing", async () => {
  const commands = new Commands(
    { run: async () => 0 },
    {
      json: {
        call: async () => ({
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
        }),
      },
    },
  );
  let notice: Notice | undefined;
  commands.onEvent((e) => {
    if (e.type === "ended" && e.notice) notice = e.notice.en;
  });
  const r = await commands.run({ name: "settings-save", key: "agent", value: "claude -p" });
  assert.ok(r.ok);
  assert.deepEqual(r.ok && r.written, []);
  assert.equal(r.ok && r.findings?.[0]?.code, "config_value_invalid");
  assert.equal(notice?.tone, "refused");
  assert.match(notice!.ran, /config_value_invalid/);
  assert.equal(notice?.fix, 'specgate config set agent "claude -p < {prompt_file}"');
});

test("REQ-142: a key that is no specgate key, or a value with a NUL, is refused before anything runs", () => {
  assert.equal(commandLine({ name: "settings-save", key: "../x", value: "1" }), null);
  assert.equal(commandLine({ name: "settings-save", key: "test_cmd; rm", value: "1" }), null);
  assert.equal(commandLine({ name: "settings-save", key: "test_cmd", value: "a\0b" }), null);
  assert.deepEqual(
    commandLine({ name: "settings-save", key: "profiles.claude-opus.agent", value: "x" }),
    { args: ["config", "set", "profiles.claude-opus.agent", "x"], write: true, json: true },
  );
});

// ── REQ-143 ─────────────────────────────────────────────────────────────

test("REQ-143 SCN-425: nine sections in order; Agents and profiles holds the agent and the profiles claude-sonnet and claude-opus", async () => {
  assert.deepEqual(
    SETTING_SECTIONS.map((s) => SECTION_NAMES[s].en),
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
  const { specgate } = sprich();
  const all = (await new Settings({ specgate }).view("", "en")).settings;
  // Shown in the sections' order, each section with its settings.
  const order = all.map((s) => SETTING_SECTIONS.indexOf(s.section));
  assert.deepEqual(
    order,
    [...order].sort((a, b) => a - b),
  );
  assert.deepEqual([...new Set(all.map((s) => s.section))], [...SETTING_SECTIONS]);
  const agents = all.filter((s) => s.section === "agents");
  assert.equal(find(agents, "agent")?.value, "claude -p < {prompt_file}");
  assert.equal(find(agents, "agent")?.file, "harness.config.yaml");
  assert.deepEqual(
    [...new Set(agents.filter((s) => s.group).map((s) => s.group))],
    ["claude-sonnet", "claude-opus"],
  );
  assert.equal(find(agents, "profiles.claude-sonnet.cost_per_run_hint")?.value, "0.4");
  assert.equal(find(agents, "profiles.claude-opus.cost_per_run_hint")?.value, null);
});

test("REQ-143 SCN-426: ALM names the token's variable and whether it is set — the environment asked by name only", async () => {
  const { specgate } = sprich();
  const asked: string[] = [];
  const all = (
    await new Settings({
      specgate,
      envSet: (name) => (asked.push(name), name === "JIRA_API_TOKEN"),
    }).view("", "en")
  ).settings;
  const alm = all.filter((s) => s.section === "alm");
  assert.equal(find(alm, "alm.provider")?.value, "jira");
  assert.deepEqual(find(alm, "alm.token_env")?.env, { name: "JIRA_API_TOKEN", set: true });
  // A default names its variable too: JIRA_USER, not set here.
  assert.deepEqual(find(alm, "alm.user_env")?.env, { name: "JIRA_USER", set: false });
  assert.ok(asked.includes("JIRA_API_TOKEN"));
});

test("REQ-143 SCN-427 SCN-428: the guards and the quality level are specgate's, each with its values and file", async () => {
  const { specgate } = sprich();
  const view = await new Settings({ specgate }).view("", "en");
  const guard = find(view.settings, "agent_guard")!;
  assert.equal(guard.section, "guards");
  assert.equal(guard.value, "on");
  assert.deepEqual(guard.options, ["on", "off"]);
  const quality = find(view.settings, "quality")!;
  assert.equal(quality.section, "quality");
  assert.equal(quality.value, "basic");
  assert.deepEqual(quality.options, ["basic", "strict", "custom"]);
  assert.equal(quality.file, "harness.config.yaml");
  // A profile and a check are added by the field that makes one.
  assert.deepEqual(
    view.adds.map((a) => `${a.prefix}.<name>.${a.field} ${a.file}`),
    ["checks.<name>.run harness.config.yaml", "profiles.<name>.agent .harness/profiles.yaml"],
  );
});

test("REQ-143: editor, terminal, shortcuts and appearance are the user's; the shortcuts are shown, not changed", async () => {
  const all = (await new Settings({}).view("", "es")).settings;
  for (const s of all) assert.equal(s.scope, "user");
  assert.deepEqual(
    [...new Set(all.map((s) => s.section))],
    ["editor", "terminal", "shortcuts", "appearance"],
  );
  const shortcuts = all.filter((s) => s.section === "shortcuts");
  assert.ok(shortcuts.length >= 10);
  assert.ok(shortcuts.every((s) => s.readOnly));
  assert.equal(find(all, "shortcut.palette")?.value, "Mod+Shift+P");
});
