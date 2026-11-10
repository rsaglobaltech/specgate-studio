/**
 * draft-terminal in a real browser, with real shells: the Developer's shell in
 * the project's folder (REQ-051, REQ-052), the studio's commands echoed with
 * their button and never typed into a shell (REQ-053, REQ-054), several
 * terminals (REQ-055), each keeping its scrollback (REQ-056).
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { MOD, close, open, studio, termText, untilTerm, type Page } from "./support.js";

const WIN = process.platform === "win32";

/** Opens a terminal of the Developer's with "+", returns its id. */
async function newTerminal(page: Page): Promise<string> {
  const before = await page.$$eval(".term-tab", (els) => els.length);
  await page.click(".term-new");
  await page.waitForFunction((n) => document.querySelectorAll(".term-tab").length > n, before);
  const id = (await page.getAttribute('.term-tab[aria-selected="true"]', "data-terminal"))!;
  return id;
}

/** Types a line into the selected terminal. */
async function type(page: Page, id: string, line: string) {
  await page.click(`.xterm-host[data-terminal="${id}"] .xterm`);
  await page.keyboard.type(line);
  await page.keyboard.press("Enter");
}

async function ready(page: Page) {
  await page.waitForSelector(".term-tabs");
}

const tick = WIN
  ? "while($true){ echo tick; Start-Sleep -Milliseconds 200 }"
  : "while true; do echo tick; sleep 0.2; done";
const ticks = (text: string) => (text.match(/^tick$/gm) ?? []).length;

test(`REQ-051 ${WIN ? "SCN-151" : "SCN-151 SCN-152"}, REQ-052${WIN ? " SCN-153" : ""}: a new terminal starts the Developer's shell in the project's folder; ${WIN ? "Get-Location" : "pwd"} prints it`, async () => {
  const s = await studio();
  const page = await open(s);
  try {
    await ready(page);
    const id = await newTerminal(page);
    assert.match(
      (await page.textContent(`.term-tab[data-terminal="${id}"]`)) ?? "",
      WIN ? /^(pwsh|powershell) 1/ : /^(zsh|bash|sh) 1/,
    );
    await type(page, id, WIN ? "Get-Location" : "pwd");
    await untilTerm(page, id, new RegExp(path.basename(s.projectDir)));
  } finally {
    await close(s, page);
  }
});

test(
  "REQ-052 SCN-154: `less spec.md`, then q — the file paged over the whole terminal, then the prompt with the earlier lines in place",
  { skip: WIN && "less is not on Windows" },
  async () => {
    const s = await studio();
    fs.writeFileSync(
      path.join(s.projectDir, "spec.md"),
      Array.from({ length: 200 }, (_, i) => `requirement line ${i + 1}`).join("\n"),
    );
    const page = await open(s);
    try {
      await ready(page);
      const id = await newTerminal(page);
      await type(page, id, "echo before-less");
      await untilTerm(page, id, /^before-less$/m);
      await type(page, id, "less spec.md");
      await page.waitForFunction(
        (tid) => (window as any).__studio.terms.get(tid).buffer.active.type === "alternate",
        id,
      );
      await untilTerm(page, id, /requirement line 1\n/);
      await page.keyboard.press("q");
      await page.waitForFunction(
        (tid) => (window as any).__studio.terms.get(tid).buffer.active.type === "normal",
        id,
      );
      assert.match(await termText(page, id), /^before-less$/m, "the earlier lines are in place");
    } finally {
      await close(s, page);
    }
  },
);

test('REQ-053 SCN-155: the panel closed, Check pressed — the terminal opens with `▶ "Check the gate" · specgate check`, its stages, `exit 0`', async () => {
  const s = await studio();
  const page = await open(s);
  try {
    await ready(page);
    await page.keyboard.press(`${MOD}+J`);
    assert.equal(await page.$eval(".panel", (e) => (e as HTMLElement).hidden), true);
    await page.click(".actions .btn.pri");
    await untilTerm(
      page,
      "specgate",
      /▶ "Check the gate" · specgate check\n✔ Specification\n✔ Tests\nexit 0/,
    );
    assert.equal(await page.$eval(".panel", (e) => (e as HTMLElement).hidden), false);
    assert.equal(
      await page.getAttribute('.term-tab[aria-selected="true"]', "data-terminal"),
      "specgate",
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-053 SCN-156: a terminal busy with a running command, Check pressed — the echo goes to the studio's terminal, the other keeps running untouched", async () => {
  const s = await studio();
  const page = await open(s);
  try {
    await ready(page);
    const id = await newTerminal(page);
    await type(page, id, tick);
    await untilTerm(page, id, /^tick$/m);
    await page.click(".actions .btn.pri");
    await untilTerm(page, "specgate", /specgate check[\s\S]*exit 0/);
    const before = ticks(await termText(page, id));
    await page.waitForTimeout(800);
    const after = await termText(page, id);
    assert.ok(ticks(after) > before, "still running");
    assert.doesNotMatch(after, /specgate check/, "its output untouched");
    assert.deepEqual(s.runs, [["check"]]);
  } finally {
    await close(s, page);
  }
});

test("REQ-054 SCN-158: typing `ls` into the studio's terminal runs nothing — a note says commands go in a terminal of their own, with the button", async () => {
  const s = await studio();
  const page = await open(s);
  try {
    await ready(page);
    await page.click(".actions .btn.pri");
    await untilTerm(page, "specgate", /exit 0/);
    const shown = await termText(page, "specgate");
    await type(page, "specgate", "ls");
    await page.waitForSelector(".term-note");
    assert.match((await page.textContent(".term-note")) ?? "", /typed in a terminal of your own/);
    // The same text (xterm may refit and add blank rows below it): nothing typed shows.
    assert.equal(
      (await termText(page, "specgate")).trimEnd(),
      shown.trimEnd(),
      "nothing typed shows",
    );
    assert.doesNotMatch(await termText(page, "specgate"), /\bls\b/);
    assert.deepEqual(s.runs, [["check"]], "nothing ran");
    await page.click('.term-note button:has-text("Open a terminal")');
    await page.waitForFunction(
      () =>
        document.querySelector('.term-tab[aria-selected="true"]')?.getAttribute("data-terminal") !==
        "specgate",
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-055 SCN-159: a terminal running, a second opened — both listed, the second answers while the first keeps running", async () => {
  const s = await studio();
  const page = await open(s);
  try {
    await ready(page);
    const a = await newTerminal(page);
    await type(page, a, tick);
    await untilTerm(page, a, /^tick$/m);
    const b = await newTerminal(page);
    await type(page, b, "git --version");
    await untilTerm(page, b, /git version/);
    assert.equal(await page.$$eval(".term-tab", (els) => els.length), 2);
    const before = ticks(await termText(page, a));
    await page.waitForTimeout(600);
    assert.ok(ticks(await termText(page, a)) > before, "the first keeps running");
  } finally {
    await close(s, page);
  }
});

test("REQ-055 SCN-160: three terminals, the second closed — the first and third listed, still running, their output in place", async () => {
  const s = await studio();
  const page = await open(s);
  try {
    await ready(page);
    const ids = [await newTerminal(page), await newTerminal(page), await newTerminal(page)];
    for (const [i, id] of ids.entries()) {
      await page.click(`.term-tab[data-terminal="${id}"]`);
      await type(page, id, `echo marker-${i + 1}`);
      await untilTerm(page, id, new RegExp(`^marker-${i + 1}$`, "m"));
    }
    await page.click(`.term-tab[data-terminal="${ids[1]}"] .x`);
    await page.waitForFunction(() => document.querySelectorAll(".term-tab").length === 2);
    assert.deepEqual(
      await page.$$eval(".term-tab", (els) => els.map((e) => e.getAttribute("data-terminal"))),
      [ids[0], ids[2]],
    );
    for (const [i, id] of [ids[0]!, ids[2]!].entries()) {
      const n = i === 0 ? 1 : 3;
      assert.match(await termText(page, id), new RegExp(`^marker-${n}$`, "m"));
      await page.click(`.term-tab[data-terminal="${id}"]`);
      await type(page, id, `echo alive-${n}`);
      await untilTerm(page, id, new RegExp(`^alive-${n}$`, "m"));
    }
  } finally {
    await close(s, page);
  }
});

test("REQ-056 SCN-161: 1,200 lines printed, Changes opened, the panel hidden and shown — all 1,200 lines still there, in order", async () => {
  const s = await studio();
  const page = await open(s);
  try {
    await ready(page);
    const id = await newTerminal(page);
    await type(page, id, WIN ? "1..1200" : "seq 1 1200");
    await untilTerm(page, id, /^1200$/m);
    await page.click('.sga[data-view="changes"]');
    await page.keyboard.press(`${MOD}+J`);
    await page.keyboard.press(`${MOD}+J`);
    const lines = (await termText(page, id)).split("\n");
    const at = (n: number) => lines.indexOf(String(n));
    assert.ok(at(1) >= 0 && at(600) > at(1) && at(1200) > at(600), "1, 600 and 1200 in order");
    for (let n = 1; n <= 1200; n++) assert.ok(lines.includes(String(n)), `line ${n}`);
  } finally {
    await close(s, page);
  }
});

test("REQ-056 SCN-162: from the second terminal back to the first — its output where it was, none of the second's in it", async () => {
  const s = await studio();
  const page = await open(s);
  try {
    await ready(page);
    const a = await newTerminal(page);
    await type(page, a, "echo log-of-the-first");
    await untilTerm(page, a, /^log-of-the-first$/m);
    const b = await newTerminal(page);
    await type(page, b, "echo tests-of-the-second");
    await untilTerm(page, b, /^tests-of-the-second$/m);
    await page.click(`.term-tab[data-terminal="${a}"]`);
    // The first shows and the second hides, in the same frame as the tab.
    await page.waitForFunction(
      (id) =>
        (document.querySelector(`.xterm-host[data-terminal="${id}"]`) as HTMLElement | null)?.style
          .display === "block",
      a,
    );
    assert.equal(
      await page.$eval(
        `.xterm-host[data-terminal="${b}"]`,
        (e) => (e as HTMLElement).style.display,
      ),
      "none",
    );
    const first = await termText(page, a);
    assert.match(first, /^log-of-the-first$/m);
    assert.doesNotMatch(first, /tests-of-the-second/);
  } finally {
    await close(s, page);
  }
});
