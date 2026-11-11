/**
 * draft-desktop REQ-158 in a real browser: sprich open in the desktop app
 * and in a browser tab share one core host, so an answer given in the browser
 * shows in the desktop window without a reload. The desktop window shows the
 * same UI bundle from the same host; here it is a second page on that host.
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { HostLocks } from "@specgate-studio/host";
import { serveOrJoin } from "../src/index.js";
import { close, open, studio } from "./support.js";

const Q2 = {
  id: "Q2",
  change: "draft-pedidos",
  text: "Until when can an order be cancelled?",
  blocks: ["REQ-031"],
  options: ["24 h", "48 h"],
  asked: "brief",
};
const card = (id: string) => `.qcard[data-question="${id}"]`;

test("REQ-158 SCN-465: Q2 answered in the browser shows answered in the desktop window, without a reload, over one host", async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "sg-home-"));
  const locks = new HostLocks(home);
  // The desktop app's host for sprich, its lock written as its sidecar writes it.
  const s = await studio({
    locks,
    questions: { open: [Q2], answered: [] },
    homeRequirements: [
      {
        id: "REQ-031",
        title: "Cancel an order",
        category: "WAITING_FOR_ANSWER",
        needs: "an answer",
      },
    ],
  });
  // `specgate-studio serve` in sprich's folder joins it.
  const served = await serveOrJoin({ projectDir: s.projectDir, port: 0, locks });
  assert.equal(served.joined, true);
  assert.equal(served.url, s.url);
  const desktop = await open({ url: served.url });
  const browser = await open({ url: served.url });
  try {
    for (const page of [desktop, browser]) {
      await page.click('.sga[data-view="questions"]');
      await page.waitForSelector(card("Q2"));
    }
    let reloaded = false;
    desktop.on("framenavigated", () => (reloaded = true));
    await browser.click(`${card("Q2")} [data-option="24 h"]`);
    await browser.click(`${card("Q2")} [data-act="answer"]`);
    await desktop.waitForSelector(`${card("Q2")}[data-state="answered"]`);
    assert.match((await desktop.textContent(card("Q2"))) ?? "", /Answer: 24 h/);
    assert.equal(reloaded, false, "the desktop window was not reloaded");
    assert.deepEqual(s.runs, [["answer", "Q2", "24 h", "--change", "draft-pedidos"]]);
  } finally {
    await desktop.close();
    await close(s, browser);
    assert.deepEqual(fs.readdirSync(path.join(home, "hosts")), [], "its lock left with it");
    fs.rmSync(home, { recursive: true, force: true });
  }
});
