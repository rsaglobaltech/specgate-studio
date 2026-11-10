/**
 * draft-help in a real browser: the "?" beside a feature that acts opens its
 * five parts and runs nothing (REQ-061), in the chosen language (REQ-065), and
 * Check's notice says what ran, what it wrote and what comes next (REQ-063).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { MOD, close, open, studio, type Page } from "./support.js";

const parts = (page: Page) =>
  page.$$eval(".help [data-part]", (els) =>
    els.map((e) => [e.querySelector("dt")?.textContent, e.querySelector("dd")?.textContent]),
  );

test('REQ-061 SCN-181: the "?" beside Check on Home — what it does, `specgate check`, no file, no commit or push, then apply; nothing ran', async () => {
  const s = await studio({ next: "specgate apply REQ-031" });
  const page = await open(s);
  try {
    await page.waitForFunction(
      () => document.querySelector(".next .mono")?.textContent === "specgate apply REQ-031",
    );
    await page.click('.actions .hq[aria-label="What does “Check the gate” do?"]');
    await page.waitForSelector('.help [data-part="next"]');
    const p = await parts(page);
    assert.deepEqual(
      p.map(([label]) => label),
      ["What it does", "Command", "Files it changes", "What it does not do", "Next"],
    );
    assert.equal(p[1]![1], "specgate check");
    assert.match(p[2]![1]!, /no file/i);
    assert.match(p[3]![1]!, /commit/);
    assert.match(p[3]![1]!, /push/);
    assert.match(p[4]![1]!, /specgate apply REQ-031/);
    assert.deepEqual(s.runs, [], "no command was run");
  } finally {
    await close(s, page);
  }
});

test('REQ-065 SCN-189: the studio in Spanish — the "?" beside Check shows its five parts in Spanish', async () => {
  const s = await studio();
  const page = await open(s, { lang: "es" });
  try {
    await page.click('.actions .hq[aria-label="¿Qué hace «Comprobar el gate»?"]');
    await page.waitForSelector('.help [data-part="next"]');
    const p = await parts(page);
    assert.deepEqual(
      p.map(([label]) => label),
      ["Qué hace", "Comando", "Archivos que cambia", "Qué no hace", "Siguiente"],
    );
    assert.match(p[0]![1]!, /Comprueba el gate/);
    assert.match(p[2]![1]!, /ningún archivo/);
  } finally {
    await close(s, page);
  }
});

test('REQ-065 SCN-190: in English, the "?" beside Archive in the palette — its five parts in English, and nothing archived', async () => {
  const s = await studio();
  const page = await open(s);
  try {
    await page.keyboard.press(`${MOD}+Shift+P`);
    await page.keyboard.type("archive");
    await page.click('.palette li .hq[aria-label="What does “Archive a change” do?"]');
    await page.waitForSelector('.help [data-part="next"]');
    const p = await parts(page);
    assert.equal(p[0]![0], "What it does");
    assert.match(p[0]![1]!, /Merges the change/);
    assert.equal(p[1]![1], "specgate archive <change>");
    assert.match(p[2]![1]!, /capability specs/);
    assert.deepEqual(s.runs, []);
  } finally {
    await close(s, page);
  }
});

test('REQ-063 SCN-185: Check passes — the notice names `specgate check` and its stages, no file written, and `specgate apply REQ-031`; never only "done"', async () => {
  const s = await studio({ next: "specgate apply REQ-031" });
  const page = await open(s);
  try {
    await page.waitForFunction(
      () => document.querySelector(".next .mono")?.textContent === "specgate apply REQ-031",
    );
    await page.click(".actions .btn.pri");
    await page.waitForSelector('.notice[data-tone="ok"]');
    const text = (sel: string) => page.textContent(`.notice [data-part="${sel}"]`);
    assert.match(
      (await text("ran")) ?? "",
      /`specgate check` ran the specification, architecture and tests stages/,
    );
    assert.equal(await text("wrote"), "No file was written.");
    assert.equal(await text("next"), "Next: specgate apply REQ-031");
    assert.deepEqual(s.runs, [["check"]]);
    assert.notEqual(((await page.textContent(".notice")) ?? "").trim().toLowerCase(), "done");
  } finally {
    await close(s, page);
  }
});
