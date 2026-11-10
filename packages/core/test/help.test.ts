/**
 * draft-help — what every action says, as data in the core (A3): the five
 * parts of its "?" (REQ-061, REQ-062), the notice when it ends (REQ-063,
 * REQ-064), both in English and Spanish or the tests fail (REQ-065).
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTIONS,
  HELP,
  PART_LABELS,
  explain,
  missingTranslations,
  notice,
  type Catalog,
} from "../src/index.js";

const PARTS = ["does", "command", "files", "doesNot", "next"] as const;

test("REQ-065: every action that acts has its five parts in English and Spanish", () => {
  assert.deepEqual(missingTranslations(HELP), []);
  for (const action of ACTIONS) {
    for (const lang of ["en", "es"] as const) {
      const e = HELP[action][lang]!;
      for (const part of PARTS) assert.ok(e[part].trim(), `${action}.${lang}.${part}`);
    }
  }
  assert.deepEqual(Object.keys(PART_LABELS.en), [...PARTS]);
  assert.deepEqual(Object.values(PART_LABELS.en), [
    "What it does",
    "Command",
    "Files it changes",
    "What it does not do",
    "Next",
  ]);
  assert.deepEqual(Object.values(PART_LABELS.es), [
    "Qué hace",
    "Comando",
    "Archivos que cambia",
    "Qué no hace",
    "Siguiente",
  ]);
});

test("REQ-065 SCN-191: Archive with English and no Spanish — the check names `archive` and `es`", () => {
  const broken: Catalog = { ...HELP, archive: { en: HELP.archive.en! } };
  assert.deepEqual(missingTranslations(broken), [{ action: "archive", lang: "es" }]);
  const blank: Catalog = {
    ...HELP,
    archive: { ...HELP.archive, es: { ...HELP.archive.es!, next: " " } },
  };
  assert.deepEqual(missingTranslations(blank), [{ action: "archive", lang: "es" }]);
});

test('REQ-061 SCN-181: the "?" beside Check — what it does, `specgate check`, no file changed, no commit or push, then apply', () => {
  const e = explain("check", "en", { req: "REQ-031" });
  assert.equal(e.command, "specgate check");
  assert.match(e.files, /no file/i);
  assert.match(e.doesNot, /commit/);
  assert.match(e.doesNot, /push/);
  assert.match(e.next, /specgate apply REQ-031/);
});

test('REQ-061 SCN-182: the "?" beside Build on REQ-031 — `specgate harness run --req REQ-031`, it does not push, then the gate on its branch', () => {
  const e = explain("build", "en", { req: "REQ-031" });
  assert.equal(e.command, "specgate harness run --req REQ-031");
  assert.match(e.files, /may change/i);
  assert.match(e.doesNot, /push/);
  assert.match(e.next, /gate/i);
  assert.match(e.next, /branch/i);
});

for (const [scn, lang] of [
  ["SCN-183", "en"],
  ["SCN-184", "es"],
] as const) {
  test(`REQ-062 ${scn}: the "?" beside Ask for a change (${lang}) — written to the draft's review.md, the draft changes only when drafted again`, () => {
    const e = explain("ask-change", lang, { change: "draft-pedidos", module: "pedidos" });
    assert.match(e.files, /docs\/specs\/changes\/draft-pedidos\/review\.md/);
    assert.match(e.next, /specgate propose --from-brief pedidos/);
    assert.match(e.doesNot, lang === "en" ? /requirements/ : /requisitos/);
  });
}

test('REQ-065 SCN-189: the "?" beside Check in Spanish — the five parts in Spanish', () => {
  const e = explain("check", "es", { req: "REQ-031" });
  assert.match(e.does, /comprueba/i);
  assert.equal(e.command, "specgate check");
  assert.match(e.files, /ningún archivo/i);
});

test('REQ-065 SCN-190: the "?" beside Archive in English — the five parts in English', () => {
  const e = explain("archive", "en", { change: "draft-pedidos" });
  assert.equal(e.command, "specgate archive draft-pedidos");
  assert.match(e.files, /capabilit/i);
  assert.match(e.does, /merges/i);
});

test("REQ-063 SCN-185: Check passes — the notice names `specgate check`, its stages, no file written, and `specgate apply REQ-031`", () => {
  const n = notice("check", "en", { req: "REQ-031" }, { exitCode: 0, findings: [], written: [] });
  assert.equal(n.tone, "ok");
  assert.match(n.ran, /specgate check/);
  assert.match(n.ran, /specification, architecture and tests/);
  assert.match(n.wrote, /No file was written/);
  assert.equal(n.next, "specgate apply REQ-031");
  assert.notEqual(n.ran.trim().toLowerCase(), "done");
});

test("REQ-063 SCN-186: Apply refused — `apply_no_test`, nothing written, the fix", () => {
  const n = notice(
    "apply",
    "en",
    { req: "REQ-031" },
    {
      exitCode: 1,
      written: [],
      findings: [
        {
          severity: "error",
          code: "apply_no_test",
          message: "REQ-031 has no test that names it.",
          target: "REQ-031",
          fix: "write a test that names REQ-031",
        },
      ],
    },
  );
  assert.equal(n.tone, "refused");
  assert.match(n.ran, /specgate apply REQ-031/);
  assert.match(n.ran, /apply_no_test/);
  assert.match(n.wrote, /Nothing was written/);
  assert.equal(n.fix, "write a test that names REQ-031");
});

for (const [scn, lang, unchanged] of [
  ["SCN-187", "en", /requirements are unchanged/],
  ["SCN-188", "es", /requisitos del borrador no cambian/],
] as const) {
  test(`REQ-064 ${scn}: the request written (${lang}) — the file, the draft unchanged, and \`specgate propose --from-brief pedidos\``, () => {
    const n = notice(
      "ask-change",
      lang,
      { change: "draft-pedidos", module: "pedidos" },
      { exitCode: 0, findings: [], written: ["docs/specs/changes/draft-pedidos/review.md"] },
    );
    assert.equal(n.tone, "ok");
    assert.match(n.wrote, /docs\/specs\/changes\/draft-pedidos\/review\.md/);
    assert.match(n.wrote, unchanged);
    assert.equal(n.next, "specgate propose --from-brief pedidos");
  });
}

test("REQ-063: a failure that is not a refusal names the exit code and still says what was written", () => {
  const n = notice("check", "es", {}, { exitCode: 1, findings: [], written: [] });
  assert.equal(n.tone, "failed");
  assert.match(n.ran, /código 1/);
  assert.match(n.wrote, /No se escribió ningún archivo/);
});
