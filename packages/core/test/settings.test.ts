/**
 * draft-settings REQ-141: the settings editor's two scopes and its search, as
 * the core answers them — project settings read through specgate, user
 * settings in the Developer's own file.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  InMemoryUserSettings,
  SETTINGS,
  Settings,
  searchSettings,
  type SpecgateAnswer,
} from "../src/index.js";

const sprich = (config: Record<string, unknown> = { test_cmd: "npm test" }) => {
  const calls: string[][] = [];
  return {
    calls,
    specgate: {
      call: async (args: readonly string[]): Promise<SpecgateAnswer> => {
        calls.push([...args]);
        return { data: { config }, findings: [], exitCode: 0 };
      },
    },
  };
};

test("REQ-141: every setting has one scope, a name and a description in English and Spanish", () => {
  for (const s of SETTINGS) {
    assert.ok(s.scope === "project" || s.scope === "user", s.key);
    for (const lang of ["en", "es"] as const) {
      assert.ok(s.name[lang].trim(), `${s.key} ${lang}`);
      assert.ok(s.description[lang].trim(), `${s.key} ${lang}`);
    }
  }
  assert.ok(SETTINGS.some((s) => s.scope === "project" && s.key === "test_cmd"));
  assert.ok(SETTINGS.some((s) => s.scope === "user" && s.key === "theme"));
});

test('REQ-141 SCN-421: "test" keeps, in both scopes, only what says test in its name or description', () => {
  const kept = searchSettings(SETTINGS, "test", "en");
  assert.ok(kept.some((s) => s.key === "test_cmd" && s.scope === "project"));
  for (const s of kept) assert.match(`${s.name.en} ${s.description.en}`, /test/i, s.key);
  assert.ok(!kept.some((s) => s.key === "theme"));
  // Empty keeps everything; case and accents do not matter.
  assert.equal(searchSettings(SETTINGS, "  ", "en").length, SETTINGS.length);
  assert.deepEqual(
    searchSettings(SETTINGS, "TEST COMMAND", "en").map((s) => s.key),
    ["test_cmd"],
  );
});

test("REQ-141: the search reads in the studio's language", () => {
  assert.deepEqual(
    searchSettings(SETTINGS, "tema", "es").map((s) => s.key),
    ["theme"],
  );
  assert.deepEqual(searchSettings(SETTINGS, "tema", "en"), []);
  assert.ok(searchSettings(SETTINGS, "idioma", "es").some((s) => s.key === "lang"));
  // Without its accent: «especificacion» finds «especificación».
  assert.deepEqual(
    searchSettings(SETTINGS, "especificacion", "es").map((s) => s.key),
    ["language"],
  );
});

test("REQ-141 SCN-421: project values come from `specgate config list --json`, user values from the user's file", async () => {
  const { specgate, calls } = sprich();
  const user = new InMemoryUserSettings("/home/dev/.config/specgate-studio/settings.json", {
    theme: "light",
  });
  const view = await new Settings({ specgate, user }).view("test", "en");
  assert.deepEqual(calls, [["config", "list"]]);
  assert.equal(view.userFile, "/home/dev/.config/specgate-studio/settings.json");
  const test_cmd = view.settings.find((s) => s.key === "test_cmd");
  assert.equal(test_cmd?.scope, "project");
  assert.equal(test_cmd?.value, "npm test");
  assert.ok(!view.settings.some((s) => s.key === "theme"));
  const all = await new Settings({ specgate, user }).view("", "en");
  assert.equal(all.settings.find((s) => s.key === "theme")?.value, "light");
  assert.equal(all.settings.find((s) => s.key === "arch_cmd")?.value, null);
});

test("REQ-141 SCN-422: a user setting is written to the user's file only, and the notice names it", async () => {
  const { specgate, calls } = sprich();
  const user = new InMemoryUserSettings("/home/dev/.config/specgate-studio/settings.json", {
    theme: "dark",
    lang: "en",
  });
  const r = await new Settings({ specgate, user }).setUser("theme", "light");
  assert.equal(r.ok, true);
  assert.deepEqual(await user.read(), { theme: "light", lang: "en" });
  assert.deepEqual(calls, [], "specgate is not run: nothing of the project is written");
  if (!r.ok) return;
  for (const lang of ["en", "es"] as const) {
    assert.equal(r.notice[lang].tone, "ok");
    assert.ok(
      `${r.notice[lang].ran} ${r.notice[lang].wrote}`.includes(user.file),
      r.notice[lang].ran,
    );
  }
});

test("REQ-141: a project setting, an unknown key or a value not offered is not a user setting", async () => {
  const { specgate } = sprich();
  const user = new InMemoryUserSettings("/u/settings.json");
  const settings = new Settings({ specgate, user });
  for (const [k, v] of [
    ["test_cmd", "pnpm test"],
    ["nope", "x"],
    ["theme", "pink"],
    ["lang", 3],
  ] as const) {
    const r = await settings.setUser(k, v);
    assert.equal(r.ok, false, `${k}=${v}`);
  }
  assert.deepEqual(await user.read(), {});
});

test("REQ-141: specgate not answering leaves the project values unset, the user scope still read", async () => {
  const user = new InMemoryUserSettings("/u/settings.json", { lang: "es" });
  const view = await new Settings({
    specgate: { call: async () => Promise.reject(new Error("no specgate")) },
    user,
  }).view("", "en");
  assert.equal(view.settings.find((s) => s.key === "test_cmd")?.value, null);
  assert.equal(view.settings.find((s) => s.key === "lang")?.value, "es");
  const none = await new Settings({ user }).view("", "en");
  assert.equal(none.settings.find((s) => s.key === "test_cmd")?.value, null);
});
