/**
 * draft-changes in a real browser, on fakes: sprich's changes in three groups
 * (REQ-081), a change from a ticket reviewed and confirmed (REQ-084), archive
 * only after its preview (REQ-085), Apply's notice from specgate's findings
 * (REQ-086, help REQ-063). specgate's `--json` answers are recorded; nothing
 * runs that the Developer did not confirm.
 */
import test from "node:test";
import assert from "node:assert/strict";
import type { SpecgateAnswer } from "@specgate-studio/core";
import { close, open, studio, untilTerm, type Page } from "./support.js";

type Req = { id: string; title: string; category: string; needs: string | null; change?: string };

/** `change show <id> --json` of a sprich change. */
function shown(id: string, config: Record<string, unknown>, cap: string, added: string[]) {
  return {
    data: {
      change: {
        id,
        title: `Proposal: ${id}`,
        config: { specgate_change_version: 1, schema: "spec-driven", ...config },
        deltaCount: 1,
        deltas: [
          {
            capability: cap,
            file: `docs/specs/changes/${id}/specs/${cap}/spec.md`,
            added,
            modified: [],
            removed: [],
          },
        ],
        tasks: { total: 0, complete: 0 },
      },
    },
    findings: [],
    exitCode: 0,
  };
}

const refusedApply = (req: string): SpecgateAnswer => ({
  data: { requirement: null },
  findings: [
    {
      severity: "error",
      code: "apply_no_test",
      message: `${req} has no test that names it yet (TDD-1).`,
      target: req,
      fix: `write a test that names ${req} (and its scenario SCN-${req.slice(4)}), then run specgate apply ${req}`,
    },
  ],
  exitCode: 1,
});

/** Apply that passes: the requirement is DONE in the next status, as specgate's would be. */
const passedApply =
  (req: string) =>
  (data: Record<string, unknown>): SpecgateAnswer => {
    for (const r of (data.home as { requirements: Req[] }).requirements)
      if (r.id === req) Object.assign(r, { category: "DONE", needs: null });
    return {
      data: { requirement: { id: req, status: "Implemented", rowsUpdated: 1 } },
      findings: [],
      exitCode: 0,
    };
  };

const writes = [
  { file: "docs/specs/capabilities/rounding/spec.md", kind: "spec" },
  { file: "features/rounding/REQ-040.feature", kind: "feature" },
  { file: "docs/specs/traceability.md", kind: "traceability" },
];
const archived = (dryRun: boolean): SpecgateAnswer => ({
  data: {
    archive: {
      change: "fix-rounding",
      archivedAs: "2026-11-11-fix-rounding",
      writes,
      deletes: [],
      warnings: [],
      ...(dryRun ? { dryRun: true } : {}),
    },
  },
  findings: [],
  exitCode: 0,
});

/**
 * sprich (A1): `draft-pedidos` not approved, `add-coupons` with REQ-031 to
 * apply (and REQ-030 too, when `req030` is still to apply), `fix-rounding`
 * with every requirement applied.
 */
function sprich(o: { applyPasses?: boolean; req030?: boolean; branch?: string } = {}) {
  const requirements: Req[] = [
    { id: "REQ-028", title: "Health", category: "DONE", needs: null },
    {
      id: "REQ-027",
      title: "Order lines",
      category: "NEEDS_TEST",
      needs: "its test",
      change: "draft-pedidos",
    },
    o.req030
      ? {
          id: "REQ-030",
          title: "A coupon",
          category: "NEEDS_TEST",
          needs: "its test",
          change: "add-coupons",
        }
      : { id: "REQ-030", title: "A coupon", category: "DONE", needs: null, change: "add-coupons" },
    {
      id: "REQ-031",
      title: "A coupon once",
      category: "NEEDS_TEST",
      needs: "its test",
      change: "add-coupons",
    },
    {
      id: "REQ-040",
      title: "Round half up",
      category: "DONE",
      needs: null,
      change: "fix-rounding",
    },
  ];
  return studio({
    branch: o.branch ?? "develop",
    sections: {
      home: {
        total: requirements.length,
        pending: requirements.filter((r) => r.category !== "DONE").length,
        requirements,
        nextCommand: "specgate apply REQ-031",
      },
      changes: {
        changes: [{ id: "draft-pedidos" }, { id: "add-coupons" }, { id: "fix-rounding" }],
        archived: 0,
      },
    },
    specgate: {
      "change show draft-pedidos": shown("draft-pedidos", { brief: "docs/brief.md" }, "pedidos", [
        "REQ-027 — Order lines",
      ]),
      "change show add-coupons": shown("add-coupons", {}, "coupons", [
        "REQ-030 — A coupon",
        "REQ-031 — A coupon once",
      ]),
      "change show fix-rounding": shown("fix-rounding", {}, "rounding", [
        "REQ-040 — Round half up",
      ]),
      "apply REQ-031": o.applyPasses ? passedApply("REQ-031") : refusedApply("REQ-031"),
      "apply REQ-030": passedApply("REQ-030"),
      "archive fix-rounding --dry-run": archived(true),
      "archive fix-rounding": archived(false),
      "propose --from-ticket KAN-13 --check": {
        data: {
          ticket: {
            key: "KAN-13",
            summary: "Register a vehicle entry",
            type: "Story",
            parent: "KAN-5",
            labels: [],
            url: null,
            intent: "As an attendant I want to register a vehicle entry.",
            source: null,
            criteria: [
              "Given a plate, when it enters, then an entry is recorded with its time",
              "Given a plate already inside, when it enters again, then it is refused",
            ],
            questions: [{ text: "Does a motorbike pay the same?", assumption: null }],
          },
          ready: true,
          capability: "parking",
          errors: 0,
          warnings: 0,
          next: "specgate propose --from-ticket KAN-13",
        },
        findings: [],
        exitCode: 0,
      },
      "propose --from-ticket KAN-13 --no-branch --no-push": {
        data: {
          change: "kan-13-register-a-vehicle-entry",
          capability: "parking",
          created: ["docs/specs/changes/kan-13-register-a-vehicle-entry/ticket.md"],
          branch: "feature/parking/KAN-13",
          pushed: false,
        },
        findings: [],
        exitCode: 0,
      },
    },
  });
}

async function changes(page: Page) {
  await page.click('.sga[data-view="changes"]');
  await page.waitForSelector('.cgroup[data-group="ready"] .change');
}

const heading = (page: Page, g: string) => page.textContent(`.cgroup[data-group="${g}"] h2`);
const cards = (page: Page, g: string) =>
  page.$$eval(`.cgroup[data-group="${g}"] .change`, (els) =>
    els.map((e) => e.getAttribute("data-change")),
  );
const text = (page: Page, part: string) => page.textContent(`.notice [data-part="${part}"]`);

test('REQ-081 SCN-241: sprich in Changes — "To review (1)" draft-pedidos, "In progress (1)" add-coupons, "Ready to archive (1)" fix-rounding', async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await changes(page);
    assert.equal(await heading(page, "review"), "To review (1)");
    assert.deepEqual(await cards(page, "review"), ["draft-pedidos"]);
    assert.equal(await heading(page, "progress"), "In progress (1)");
    assert.deepEqual(await cards(page, "progress"), ["add-coupons"]);
    assert.equal(await heading(page, "ready"), "Ready to archive (1)");
    assert.deepEqual(await cards(page, "ready"), ["fix-rounding"]);
    assert.deepEqual(s.runs, [], "opening Changes runs no command");
  } finally {
    await close(s, page);
  }
});

test("REQ-081 SCN-242: add-coupons' last requirement applied, Changes opened again — under Ready to archive, no longer In progress", async () => {
  const s = await sprich({ applyPasses: true });
  const page = await open(s);
  try {
    await changes(page);
    assert.deepEqual(await cards(page, "progress"), ["add-coupons"]);
    await page.click(
      '.change[data-change="add-coupons"] li[data-req="REQ-031"] [data-action="apply"]',
    );
    await page.waitForSelector('.notice[data-tone="ok"]');
    await page.click('.sga[data-view="home"]');
    await page.click('.sga[data-view="changes"]');
    await page.waitForFunction(
      () =>
        !!document.querySelector('.cgroup[data-group="ready"] .change[data-change="add-coupons"]'),
    );
    assert.deepEqual(await cards(page, "progress"), []);
    assert.deepEqual(await cards(page, "ready"), ["add-coupons", "fix-rounding"]);
    assert.equal(await heading(page, "ready"), "Ready to archive (2)");
  } finally {
    await close(s, page);
  }
});

test("REQ-084 SCN-247: on feature/parking/KAN-13 — reviewed, told the branch and no push, then `specgate propose --from-ticket KAN-13 --no-branch --no-push`", async () => {
  const s = await sprich({ branch: "feature/parking/KAN-13" });
  const page = await open(s);
  try {
    await changes(page);
    await page.click('[data-action="from-ticket"]');
    await page.fill('input[name="ticket-key"]', "KAN-13");
    await page.click('[data-action="review-ticket"]');
    await page.waitForSelector('.ticket-review [data-part="branch"]');
    assert.match((await page.textContent(".ticket-review")) ?? "", /Register a vehicle entry/);
    assert.match(
      (await page.textContent('.ticket-review [data-part="criteria"]')) ?? "",
      /an entry is recorded with its time/,
    );
    assert.equal(
      await page.textContent('.ticket-review [data-part="branch"]'),
      "Opens on feature/parking/KAN-13, the branch you are on.",
    );
    assert.match((await page.textContent('.ticket-review [data-part="commit"]')) ?? "", /Commits/);
    assert.equal(
      await page.textContent('.ticket-review [data-part="push"]'),
      "Pushes the branch to origin.",
    );
    await page.check('.ticket-review input[name="no-push"]');
    assert.match(
      (await page.textContent('.ticket-review [data-part="push"]')) ?? "",
      /Does not push/,
    );
    assert.equal(
      await page.textContent('.ticket-review [data-part="command"]'),
      "specgate propose --from-ticket KAN-13 --no-branch --no-push",
    );
    // Before the confirmation, only the review was read.
    assert.deepEqual(
      s.calls.filter((c) => c[0] === "propose"),
      [["propose", "--from-ticket", "KAN-13", "--check"]],
    );
    await page.click('[data-action="confirm-ticket"]');
    await page.waitForSelector('.notice[data-tone="ok"]');
    assert.deepEqual(s.calls.filter((c) => c[0] === "propose").at(-1), [
      "propose",
      "--from-ticket",
      "KAN-13",
      "--no-branch",
      "--no-push",
    ]);
    await untilTerm(
      page,
      "specgate",
      /▶ "Open the change" · specgate propose --from-ticket KAN-13 --no-branch --no-push/,
    );
    assert.match((await text(page, "wrote")) ?? "", /ticket\.md/);
  } finally {
    await close(s, page);
  }
});

test("REQ-084 SCN-248: the review of KAN-13 closed without confirming — no command ran, no branch, nothing committed or pushed", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await changes(page);
    await page.click('[data-action="from-ticket"]');
    await page.fill('input[name="ticket-key"]', "KAN-13");
    await page.click('[data-action="review-ticket"]');
    await page.waitForSelector('.ticket-review [data-part="branch"]');
    assert.equal(
      await page.textContent('.ticket-review [data-part="branch"]'),
      "Opens on a new branch specgate creates for KAN-13.",
    );
    await page.click('[data-action="close-ticket"]');
    await page.waitForSelector(".ticket-review", { state: "detached" });
    assert.deepEqual(s.runs, [], "no command ran");
    assert.deepEqual(
      s.calls.filter((c) => c[0] !== "change"),
      [["propose", "--from-ticket", "KAN-13", "--check"]],
      "only the review was read: no propose that opens, branches, commits or pushes",
    );
    assert.equal(await s.git.branch(s.projectDir), "develop", "no branch was created");
    assert.equal(await page.$(".notice"), null);
  } finally {
    await close(s, page);
  }
});

test("REQ-085 SCN-249: Archive on fix-rounding — `archive fix-rounding --dry-run` first, its preview, the confirmation, then the archive and a notice naming what it wrote", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await changes(page);
    await page.click('.change[data-change="fix-rounding"] [data-action="archive"]');
    await page.waitForSelector(".archive-preview");
    assert.deepEqual(
      s.calls.filter((c) => c[0] === "archive"),
      [["archive", "fix-rounding", "--dry-run"]],
    );
    const preview = (await page.textContent(".archive-preview")) ?? "";
    for (const w of writes) assert.ok(preview.includes(w.file), `${w.file} in ${preview}`);
    assert.match(preview, /Specs[\s\S]*Matrix rows[\s\S]*Feature files/);
    await page.click('[data-action="confirm-archive"]');
    await page.waitForFunction(() =>
      /archive fix-rounding`/.test(
        document.querySelector('.notice [data-part="ran"]')?.textContent ?? "",
      ),
    );
    assert.deepEqual(
      s.calls.filter((c) => c[0] === "archive"),
      [
        ["archive", "fix-rounding", "--dry-run"],
        ["archive", "fix-rounding"],
      ],
    );
    assert.match(
      (await text(page, "ran")) ?? "",
      /`specgate archive fix-rounding` merged fix-rounding/,
    );
    const wrote = (await text(page, "wrote")) ?? "";
    for (const w of writes) assert.ok(wrote.includes(w.file), `${w.file} in ${wrote}`);
    await untilTerm(
      page,
      "specgate",
      /▶ "Archive fix-rounding" · specgate archive fix-rounding --dry-run/,
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-085: the preview cancelled — nothing archived", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await changes(page);
    await page.click('.change[data-change="fix-rounding"] [data-action="archive"]');
    await page.waitForSelector(".archive-preview");
    await page.click(".archive-preview .btn:not(.pri)");
    await page.waitForSelector(".archive-preview", { state: "detached" });
    assert.deepEqual(
      s.calls.filter((c) => c[0] === "archive"),
      [["archive", "fix-rounding", "--dry-run"]],
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-085 SCN-250: add-coupons in the browser — no Archive offered, and it says REQ-031 is still to apply", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await changes(page);
    assert.equal(await page.$('.change[data-change="add-coupons"] [data-action="archive"]'), null);
    assert.equal(
      await page.textContent('.change[data-change="add-coupons"] [data-part="to-apply"]'),
      "Not offered for archive: REQ-031 still to apply.",
    );
  } finally {
    await close(s, page);
  }
});

test('REQ-085: the "?" beside Archive — the preview and the archive, each in its five parts; nothing ran', async () => {
  const s = await sprich();
  const page = await open(s, { lang: "es" });
  try {
    await page.click('.sga[data-view="changes"]');
    await page.waitForSelector('.cgroup[data-group="ready"] .change');
    await page.click('.change[data-change="fix-rounding"] .hq');
    await page.waitForSelector('.help section[data-action="archive"] [data-part="next"]');
    assert.equal(
      await page.textContent(
        '.help section[data-action="archive-preview"] [data-part="command"] dd',
      ),
      "specgate archive fix-rounding --dry-run",
    );
    assert.match(
      (await page.textContent(
        '.help section[data-action="archive-preview"] [data-part="files"] dd',
      )) ?? "",
      /no escribe nada/,
    );
    assert.deepEqual(
      s.calls.filter((c) => c[0] === "archive"),
      [],
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-086 SCN-251: Apply on REQ-031 refused on the desktop — `specgate apply REQ-031` ran, the notice: apply_no_test, nothing written, the fix", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await changes(page);
    await page.click(
      '.change[data-change="add-coupons"] li[data-req="REQ-031"] [data-action="apply"]',
    );
    await page.waitForSelector('.notice[data-tone="refused"]');
    assert.deepEqual(
      s.calls.filter((c) => c[0] === "apply"),
      [["apply", "REQ-031"]],
    );
    await untilTerm(
      page,
      "specgate",
      /▶ "Apply REQ-031" · specgate apply REQ-031\n✖ apply_no_test/,
    );
    assert.match((await text(page, "ran")) ?? "", /apply_no_test/);
    assert.equal(await text(page, "wrote"), "Nothing was written.");
    assert.match((await text(page, "fix")) ?? "", /write a test that names REQ-031/);
  } finally {
    await close(s, page);
  }
});

test("REQ-063 SCN-186: Apply on REQ-031 with no test that names it, in the browser — the notice: `specgate apply REQ-031` refused with apply_no_test, nothing written, the fix", async () => {
  const s = await sprich();
  const page = await open(s);
  try {
    await changes(page);
    await page.click(
      '.change[data-change="add-coupons"] li[data-req="REQ-031"] [data-action="apply"]',
    );
    await page.waitForSelector('.notice[data-tone="refused"]');
    assert.match(
      (await text(page, "ran")) ?? "",
      /^`specgate apply REQ-031` was refused with apply_no_test: /,
    );
    assert.equal(await text(page, "wrote"), "Nothing was written.");
    assert.match((await text(page, "fix")) ?? "", /^Fix: write a test that names REQ-031/);
    assert.notEqual(((await page.textContent(".notice")) ?? "").trim().toLowerCase(), "failed");
  } finally {
    await close(s, page);
  }
});

test("REQ-086 SCN-252: Apply on REQ-030 in the browser — `specgate apply REQ-030` ran, REQ-030 shows Implemented, the notice names the file it wrote and the next step", async () => {
  const s = await sprich({ req030: true });
  const page = await open(s);
  try {
    await changes(page);
    await page.click(
      '.change[data-change="add-coupons"] li[data-req="REQ-030"] [data-action="apply"]',
    );
    await page.waitForSelector('.notice[data-tone="ok"]');
    assert.deepEqual(
      s.calls.filter((c) => c[0] === "apply"),
      [["apply", "REQ-030"]],
    );
    assert.match(
      (await text(page, "ran")) ?? "",
      /`specgate apply REQ-030` passed the gate and marked REQ-030 Implemented/,
    );
    assert.match(
      (await text(page, "wrote")) ?? "",
      /docs\/specs\/changes\/add-coupons\/specs\/coupons\/spec\.md/,
    );
    assert.equal(await text(page, "next"), "Next: specgate status");
    await page.waitForFunction(
      () =>
        document.querySelector('.change[data-change="add-coupons"] li[data-req="REQ-030"] .state')
          ?.textContent === "Implemented",
    );
    assert.equal(await page.$('li[data-req="REQ-030"] [data-action="apply"]'), null);
  } finally {
    await close(s, page);
  }
});
