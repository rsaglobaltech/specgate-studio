/**
 * The agent's suggested question in the browser (agent-placeholder REQ-232):
 * sprich, with draft-pedidos open, suggests asking about pedidos; a project
 * with no draft open names no module.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { close, open } from "./support.js";
import { sprich } from "./sprich.js";

const placeholder = '[data-testid="agent-input"]';

test('REQ-232 SCN-1012: sprich with draft-pedidos open, in Spanish — "¿Qué falta para aprobar pedidos?"', async () => {
  const s = await sprich();
  const page = await open(s, { lang: "es" });
  try {
    await page.waitForFunction(
      (sel) => document.querySelector(sel)?.getAttribute("placeholder")?.includes("pedidos"),
      placeholder,
    );
    assert.equal(
      await page.getAttribute(placeholder, "placeholder"),
      "¿Qué falta para aprobar pedidos?",
    );
  } finally {
    await close(s, page);
  }
});

test('REQ-232 SCN-1013: a project with no draft open, in English — "Ask about the spec…", no module named', async () => {
  const s = await sprich({ sections: { changes: { changes: [{ id: "add-coupons" }] } } });
  const page = await open(s, { lang: "en" });
  try {
    await page.waitForSelector(placeholder);
    // The suggestion with a module would come once the changes are read: give it the time.
    await page.waitForTimeout(500);
    assert.equal(await page.getAttribute(placeholder, "placeholder"), "Ask about the spec…");
  } finally {
    await close(s, page);
  }
});
