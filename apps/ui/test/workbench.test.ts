/**
 * draft-workbench — the workbench's own rules, without a browser: the views
 * and their order (REQ-031), the shortcuts and the tabs (REQ-032), the palette
 * (REQ-033), the two languages (REQ-034).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { TOP_VIEWS, BOTTOM_VIEWS } from "../src/views.js";
import { shortcut } from "../src/keys.js";
import { FEATURES, filterFeatures } from "../src/palette.js";
import { MESSAGES, t } from "../src/i18n.js";
import { closeTab, nextTab, openTab, previousTab, type Tabs } from "../src/tabs.js";

const key = (
  k: string,
  mods: Partial<Record<"ctrl" | "meta" | "shift" | "alt", boolean>> = {},
) => ({
  key: k,
  ctrlKey: !!mods.ctrl,
  metaKey: !!mods.meta,
  shiftKey: !!mods.shift,
  altKey: !!mods.alt,
});

test("REQ-031: eleven views — nine at the top in the brief's order, Help and Settings at the bottom", () => {
  assert.deepEqual(TOP_VIEWS, [
    "home",
    "explorer",
    "brief",
    "changes",
    "questions",
    "build",
    "live",
    "traceability",
    "report",
  ]);
  assert.deepEqual(BOTTOM_VIEWS, ["help", "settings"]);
  assert.deepEqual(
    [...TOP_VIEWS, ...BOTTOM_VIEWS].map((v) => t("en", `view.${v}`)),
    [
      "Home",
      "Explorer",
      "Brief",
      "Changes",
      "Questions",
      "Build",
      "Live",
      "Traceability",
      "Report",
      "Help",
      "Settings",
    ],
  );
});

test("REQ-032: the essential VS Code shortcuts, Cmd on macOS and Ctrl elsewhere", () => {
  const cases: Array<[ReturnType<typeof key>, boolean, string]> = [
    [key("P", { meta: true, shift: true }), true, "palette"],
    [key("P", { ctrl: true, shift: true }), false, "palette"],
    [key("F1"), true, "palette"],
    [key("p", { meta: true }), true, "openFile"],
    [key("s", { ctrl: true }), false, "save"],
    [key("w", { meta: true }), true, "closeTab"],
    [key("Tab", { ctrl: true }), true, "nextTab"],
    [key("Tab", { ctrl: true, shift: true }), true, "previousTab"],
    [key("b", { meta: true }), true, "toggleSidebar"],
    [key("j", { ctrl: true }), false, "togglePanel"],
    [key("`", { ctrl: true }), true, "terminal"],
    [key("E", { meta: true, shift: true }), true, "explorer"],
    [key("f", { meta: true }), true, "find"],
    [key("F", { ctrl: true, shift: true }), false, "search"],
    [key(",", { meta: true }), true, "settings"],
  ];
  for (const [event, mac, action] of cases) {
    assert.equal(
      shortcut(event, mac),
      action,
      `${JSON.stringify(event)} on ${mac ? "macOS" : "Windows/Linux"}`,
    );
  }
  // On macOS Ctrl+S is not Cmd+S; on Windows Meta+S is not Ctrl+S.
  assert.equal(shortcut(key("s", { ctrl: true }), true), null);
  assert.equal(shortcut(key("s", { meta: true }), false), null);
  assert.equal(shortcut(key("x"), false), null);
});

test("REQ-032 SCN-094: opening a second file adds its tab and makes it the active one", () => {
  let tabs: Tabs = { open: [], active: null };
  tabs = openTab(tabs, "docs/brief.md");
  tabs = openTab(tabs, "docs/specs/changes/draft-workbench/proposal.md");
  assert.deepEqual(tabs.open, ["docs/brief.md", "docs/specs/changes/draft-workbench/proposal.md"]);
  assert.equal(tabs.active, "docs/specs/changes/draft-workbench/proposal.md");
  // Opening one already open only activates it.
  tabs = openTab(tabs, "docs/brief.md");
  assert.equal(tabs.open.length, 2);
  assert.equal(tabs.active, "docs/brief.md");
});

test("REQ-032 SCN-103: Ctrl+Shift+Tab goes to the previous tab, Ctrl+Tab to the next, both wrapping; closing activates a neighbour", () => {
  const tabs: Tabs = { open: ["brief.md", "proposal.md"], active: "proposal.md" };
  assert.equal(previousTab(tabs).active, "brief.md");
  assert.equal(nextTab(tabs).active, "brief.md");
  assert.equal(previousTab({ ...tabs, active: "brief.md" }).active, "proposal.md");
  const closed = closeTab(tabs, "proposal.md");
  assert.deepEqual(closed, { open: ["brief.md"], active: "brief.md" });
  assert.deepEqual(closeTab(closed, "brief.md"), { open: [], active: null });
});

test('REQ-033 SCN-096: "ticket" finds "Open a change from a ticket" with the command it runs', () => {
  const found = filterFeatures(FEATURES, "ticket", "en");
  assert.equal(found[0]?.title.en, "Open a change from a ticket");
  assert.equal(found[0]?.command, "specgate propose --from-ticket <KEY>");
});

test("REQ-033: the palette matches in the chosen language and in English, case-insensitively, and by command", () => {
  assert.equal(filterFeatures(FEATURES, "TICKET", "es")[0]?.id, "change.fromTicket");
  assert.equal(filterFeatures(FEATURES, "comprobar", "es")[0]?.id, "gate.check");
  assert.equal(filterFeatures(FEATURES, "specgate check", "en")[0]?.id, "gate.check");
  assert.equal(filterFeatures(FEATURES, "", "en").length, FEATURES.length);
  assert.deepEqual(filterFeatures(FEATURES, "zzz-nothing", "en"), []);
});

test("REQ-033: every feature of the palette names the specgate command it runs, or runs none", () => {
  for (const f of FEATURES) {
    assert.ok(f.command === null || f.command.startsWith("specgate "), `${f.id}: ${f.command}`);
    assert.ok(f.title.en && f.title.es, `${f.id} has a title in both languages`);
  }
  const ids = FEATURES.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length, "ids are unique");
});

test("REQ-034: every label exists in Spanish and in English; the views read as the canvas names them in Spanish", () => {
  const en = Object.keys(MESSAGES.en).sort();
  const es = Object.keys(MESSAGES.es).sort();
  assert.deepEqual(es, en);
  for (const k of en) assert.ok(MESSAGES.es[k as keyof typeof MESSAGES.es], `es: ${k}`);
  assert.deepEqual(
    [...TOP_VIEWS, ...BOTTOM_VIEWS].map((v) => t("es", `view.${v}`)),
    [
      "Inicio",
      "Explorador",
      "Brief",
      "Cambios",
      "Preguntas",
      "Construir",
      "En vivo",
      "Trazabilidad",
      "Informe",
      "Ayuda",
      "Configuración",
    ],
  );
});
