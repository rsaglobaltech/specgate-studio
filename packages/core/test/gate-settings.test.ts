/**
 * specgate-1-4-gate REQ-223: the gate's policy in Settings — the section Gate
 * after Quality, its preset, its seven rules and its date, with specgate's
 * catalog as 1.4.2 answers it (fixtures/config-keys-1.4.json) and saved
 * only through `config set`.
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Commands,
  SETTING_SECTIONS,
  SECTION_NAMES,
  SECTION_SCOPE,
  Settings,
  commandLine,
  type Notice,
  type Setting,
  type SpecgateAnswer,
} from "../src/index.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KEYS = JSON.parse(
  fs.readFileSync(
    [
      path.join(HERE, "fixtures", "config-keys-1.4.json"),
      path.join(HERE, "..", "..", "test", "fixtures", "config-keys-1.4.json"),
    ].find((p) => fs.existsSync(p))!,
    "utf8",
  ),
) as { keys: unknown[] };

const RULES = ["tdd", "scenarios", "requirements", "links", "coverage", "ids", "quality"];

function project(config: Record<string, unknown>, files: Record<string, string>) {
  return {
    call: async (args: readonly string[]): Promise<SpecgateAnswer> => {
      const key = args.join(" ");
      if (key === "config keys") return { data: KEYS, findings: [], exitCode: 0 };
      if (key === "config list") return { data: { config, files }, findings: [], exitCode: 0 };
      throw new Error(`no answer for ${key}`);
    },
  };
}

const gateOf = async (config: Record<string, unknown>, files: Record<string, string> = {}) =>
  (await new Settings({ specgate: project(config, files) }).view("", "en")).settings.filter(
    (s) => s.section === "gate",
  );
const find = (all: Setting[], key: string) => all.find((s) => s.key === key);

test("REQ-223: Gate is a project section, right after Quality, named in English and Spanish", () => {
  assert.equal(SETTING_SECTIONS.indexOf("gate"), SETTING_SECTIONS.indexOf("quality") + 1);
  assert.equal(SECTION_SCOPE.gate, "project");
  assert.deepEqual(SECTION_NAMES.gate, { en: "Gate", es: "Gate" });
});

test("REQ-223 SCN-993: preset standard, coverage warning — the preset, seven rules and the date, each in both languages, kept in .specgate/gate.yaml", async () => {
  const gate = await gateOf(
    { "gate.preset": "standard", "gate.rules.coverage": "warning" },
    { "gate.preset": ".specgate/gate.yaml", "gate.rules.coverage": ".specgate/gate.yaml" },
  );
  assert.deepEqual(
    gate.map((s) => s.key),
    ["gate.preset", ...RULES.map((r) => `gate.rules.${r}`), "gate.enforce_from"],
  );
  assert.equal(find(gate, "gate.preset")?.value, "standard");
  assert.deepEqual(find(gate, "gate.preset")?.options, ["minimal", "standard", "strict"]);
  assert.equal(find(gate, "gate.rules.coverage")?.value, "warning");
  for (const r of RULES)
    assert.deepEqual(find(gate, `gate.rules.${r}`)?.options, ["error", "warning", "off"], r);
  for (const s of gate) {
    assert.equal(s.file, ".specgate/gate.yaml", s.key);
    assert.equal(s.scope, "project");
    // The studio's own words, not the key: in English and in Spanish.
    assert.notEqual(s.name.en, s.key, s.key);
    assert.notEqual(s.name.es, s.key, s.key);
    assert.ok(s.description.es && s.description.es !== s.description.en, s.key);
  }
  assert.equal(find(gate, "gate.rules.coverage")?.name.en, "Coverage");
  assert.equal(find(gate, "gate.rules.coverage")?.name.es, "Cobertura");
});

test("REQ-223 SCN-993: coverage set to error runs `config set gate.rules.coverage error`, and the notice names .specgate/gate.yaml", async () => {
  const asked: string[][] = [];
  const commands = new Commands(
    { run: async () => 0 },
    {
      json: {
        call: async (args) => {
          asked.push([...args]);
          return {
            data: {
              config: { "gate.rules.coverage": "error" },
              files: { "gate.rules.coverage": ".specgate/gate.yaml" },
            },
            findings: [],
            exitCode: 0,
          };
        },
      },
    },
  );
  let notice: Notice | undefined;
  commands.onEvent((e) => {
    if (e.type === "ended" && e.notice) notice = e.notice.en;
  });
  assert.ok(commandLine({ name: "settings-save", key: "gate.rules.coverage", value: "error" }));
  const r = await commands.run({
    name: "settings-save",
    key: "gate.rules.coverage",
    value: "error",
  });
  assert.deepEqual(asked, [["config", "set", "gate.rules.coverage", "error"]]);
  assert.deepEqual(r.ok && r.written, [".specgate/gate.yaml"]);
  assert.match(notice!.wrote, /\.specgate\/gate\.yaml/);
});

test("REQ-223 SCN-994: `next month` as the date is refused by specgate with its fix, and nothing is written", async () => {
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
              message: "next month is not a valid gate.enforce_from.",
              fix: "Give a date as YYYY-MM-DD, e.g. 2026-12-15.",
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
  const r = await commands.run({
    name: "settings-save",
    key: "gate.enforce_from",
    value: "next month",
  });
  assert.deepEqual(r.ok && r.written, []);
  assert.equal(notice?.tone, "refused");
  assert.equal(notice?.fix, "Give a date as YYYY-MM-DD, e.g. 2026-12-15.");
});

test("REQ-223 SCN-995: no policy file — preset strict and every rule error by default, no date", async () => {
  const gate = await gateOf({});
  assert.equal(find(gate, "gate.preset")?.value, null);
  assert.equal(find(gate, "gate.preset")?.default, "strict");
  for (const r of RULES) assert.equal(find(gate, `gate.rules.${r}`)?.default, "error", r);
  assert.equal(find(gate, "gate.enforce_from")?.value, null);
  assert.equal(find(gate, "gate.enforce_from")?.default, null);
});
