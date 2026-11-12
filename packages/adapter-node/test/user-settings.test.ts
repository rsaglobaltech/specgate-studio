/**
 * draft-settings REQ-141 — the Developer's own settings file on disk:
 * `settings.json` in the studio's settings folder, written whole.
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { Settings } from "@specgate-studio/core";
import { NodeUserSettings } from "../src/index.js";
import { rm, tmp } from "./helpers.js";

test("REQ-141 SCN-422: a user setting is written to settings.json in the studio's folder, nowhere else", async () => {
  const home = tmp("sg-user-settings-");
  const project = tmp("sg-user-project-");
  try {
    const user = new NodeUserSettings(path.join(home, "specgate-studio"));
    assert.equal(user.file, path.join(home, "specgate-studio", "settings.json"));
    assert.deepEqual(await user.read(), {}, "never written: nothing");
    const r = await new Settings({ user }).setUser("theme", "light");
    assert.equal(r.ok, true);
    assert.deepEqual(JSON.parse(fs.readFileSync(user.file, "utf8")), { theme: "light" });
    assert.deepEqual(await new NodeUserSettings(path.dirname(user.file)).read(), {
      theme: "light",
    });
    assert.deepEqual(fs.readdirSync(project), [], "the project is untouched");
    assert.deepEqual(fs.readdirSync(path.dirname(user.file)), ["settings.json"]);
  } finally {
    await rm(home);
    await rm(project);
  }
});

test("REQ-141: a settings file that is not JSON reads as nothing set", async () => {
  const home = tmp("sg-user-settings-");
  try {
    fs.writeFileSync(path.join(home, "settings.json"), "{ not json");
    assert.deepEqual(await new NodeUserSettings(home).read(), {});
  } finally {
    await rm(home);
  }
});
