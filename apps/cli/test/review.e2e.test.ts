/**
 * A draft's requests for change in a real browser (draft-changes REQ-082,
 * REQ-083), on fakes: `change show draft-pedidos --json` answers its
 * review.md as specgate 0.34 reads it — open or addressed, and what a redraft
 * changed — and "Draft again with N requested changes" runs
 * `propose --from-brief pedidos --agent <agent>`, recorded, never a real agent.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { close, open, termText, type Page } from "./support.js";
import { sprich } from "./sprich.js";

const DELTA = "docs/specs/changes/draft-pedidos/specs/pedidos/spec.md";

const N1 = {
  id: "N1",
  date: "2026-11-12",
  requirement: "REQ-031",
  text: "Cancel until 24 h before shipping",
  state: "open",
  addressed: null,
  line: 7,
};
const N2 = {
  id: "N2",
  date: "2026-11-12",
  requirement: "REQ-034",
  text: "Free shipping starts at 50 €, not 60 €",
  state: "addressed",
  addressed: {
    date: "2026-11-12",
    changes: [
      {
        requirement: "REQ-034",
        file: DELTA,
        line: 40,
        before: "The system SHALL make shipping free for orders of 60 € or more.",
        after: "The system SHALL make shipping free for orders of 50 € or more.",
      },
    ],
  },
  line: 8,
};
const N3 = {
  ...N1,
  id: "N3",
  requirement: "REQ-032",
  text: "Show the state of each order",
  line: 9,
};

/** `change show draft-pedidos --json` with these notes in its review.md. */
const shown = (notes: unknown[]) => ({
  data: {
    change: {
      id: "draft-pedidos",
      config: { specgate_change_version: 1, brief: "docs/brief.md" },
      deltas: [],
      review: {
        file: "docs/specs/changes/draft-pedidos/review.md",
        open: notes.filter((n) => (n as { state: string }).state === "open").length,
        notes,
      },
    },
  },
  findings: [],
  exitCode: 0,
});

async function draftPedidos(page: Page) {
  await page.click('.sga[data-view="changes"]');
  await page.click('.crow[data-change="draft-pedidos"]');
  await page.waitForSelector('[data-testid="review"]');
}

test("REQ-082 SCN-243: draft-pedidos on the desktop — one request open, one addressed, each with its text and requirement", async () => {
  const s = await sprich({ specgate: { "change show draft-pedidos": shown([N1, N2]) } });
  const page = await open(s);
  try {
    await draftPedidos(page);
    const rows = await page.$$eval('[data-testid="review"] [data-note]', (els) =>
      els.map((e) => [
        e.getAttribute("data-req"),
        e.getAttribute("data-state"),
        (e as HTMLElement).innerText.replace(/\s+/g, " ").trim(),
      ]),
    );
    assert.deepEqual(rows, [
      ["REQ-031", "open", "REQ-031 Cancel until 24 h before shipping open 2026-11-12"],
      [
        "REQ-034",
        "addressed",
        "REQ-034 Free shipping starts at 50 €, not 60 € addressed 2026-11-12",
      ],
    ]);
    assert.match(
      (await page.textContent('.crow[data-change="draft-pedidos"]'))!,
      /1 requested changes/,
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-082 SCN-244: REQ-034 redrafted, in the browser — its text before and after side by side, the changed words marked", async () => {
  const s = await sprich({ specgate: { "change show draft-pedidos": shown([N1, N2]) } });
  const page = await open(s, { lang: "es" });
  try {
    await draftPedidos(page);
    const ba = '[data-testid="before-after"][data-req="REQ-034"]';
    await page.waitForSelector(ba);
    assert.equal(
      await page.textContent(`${ba} [data-side="before"] pre`),
      "The system SHALL make shipping free for orders of 60 € or more.",
    );
    assert.equal(
      await page.textContent(`${ba} [data-side="after"] pre`),
      "The system SHALL make shipping free for orders of 50 € or more.",
    );
    assert.deepEqual(
      await page.$$eval(`${ba} mark`, (els) => els.map((e) => [e.className, e.textContent])),
      [
        ["del", "60"],
        ["ins", "50"],
      ],
    );
    const before = (await (await page.$(`${ba} [data-side="before"]`))!.boundingBox())!;
    const after = (await (await page.$(`${ba} [data-side="after"]`))!.boundingBox())!;
    assert.ok(
      after.x > before.x + before.width - 1 && Math.abs(after.y - before.y) < 2,
      "side by side",
    );
    assert.match((await page.textContent(ba))!, /Antes[\s\S]*Después/);
  } finally {
    await close(s, page);
  }
});

test('REQ-083 SCN-245: "Draft again with 2 requested changes" on the desktop — `propose --from-brief pedidos` with the agent, its echo in the terminal', async () => {
  let asked = 0;
  const s = await sprich({
    specgate: {
      "change show draft-pedidos": shown([N1, N2, N3]),
      "propose --from-brief pedidos --agent claude -p": () => {
        asked++;
        return {
          data: {
            draft: {
              module: "pedidos",
              change: "draft-pedidos",
              state: "ready",
              notes: { given: ["N1", "N3"], addressed: ["N1"], open: ["N3"] },
            },
          },
          findings: [],
          exitCode: 0,
        };
      },
    },
  });
  const page = await open(s);
  try {
    await draftPedidos(page);
    const button = '[data-action="redraft"]';
    assert.equal(await page.textContent(button), "Draft again with 2 requested changes");
    await page.click(button);
    // The echo, however the terminal's width wraps it.
    const echo = `▶ "Draft again with 2 requested changes" · specgate propose --from-brief pedidos --agent 'claude -p'`;
    for (let i = 0; i < 400; i++) {
      if ((await termText(page, "specgate")).replace(/\n/g, "").includes(echo)) break;
      await new Promise((ok) => setTimeout(ok, 50));
    }
    assert.ok((await termText(page, "specgate")).replace(/\n/g, "").includes(echo));
    await page.waitForSelector('.notice[data-tone="ok"] >> text=with its 2 open requests');
    assert.equal(asked, 1, "one draft, with the project's agent");
  } finally {
    await close(s, page);
  }
});

test('REQ-083 SCN-246: every request addressed, in the browser — no "Draft again" offered, and the draft says it has no open request', async () => {
  const s = await sprich({
    specgate: {
      "change show draft-pedidos": shown([
        { ...N1, state: "addressed", addressed: { date: "2026-11-12", changes: [] } },
        N2,
      ]),
    },
  });
  const page = await open(s);
  try {
    await draftPedidos(page);
    await page.waitForSelector('[data-testid="review-no-open"]');
    assert.equal(await page.$('[data-action="redraft"]'), null);
    assert.equal(
      await page.textContent('[data-testid="review-no-open"]'),
      "No open request for change: every request is addressed.",
    );
    assert.ok(!s.calls.some((c) => c[0] === "propose" && c.includes("--agent")));
  } finally {
    await close(s, page);
  }
});
