/**
 * draft-changes in the core: changes grouped by what they wait for (REQ-081),
 * a change from a ticket reviewed before it runs (REQ-084), archive after its
 * preview (REQ-085) and Apply's notice from specgate's findings (REQ-086,
 * help REQ-063) — every value read from specgate's `--json` answers.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  Changes,
  Commands,
  HELP,
  commandLine,
  explain,
  groupChanges,
  missingTranslations,
  ticketReview,
  type CommandEvent,
  type ProcessRunner,
  type SpecgateAnswer,
} from "../src/index.js";

/** `change show <id> --json`, as specgate 0.33.1 answers it. */
function show(id: string, config: Record<string, unknown>, added: string[], capability = "x") {
  return {
    change: {
      id,
      title: `Proposal: ${id}`,
      config: { specgate_change_version: 1, schema: "spec-driven", ...config },
      deltaCount: 1,
      deltas: [
        {
          capability,
          file: `docs/specs/changes/${id}/specs/${capability}/spec.md`,
          added,
          modified: [],
          removed: [],
        },
      ],
      tasks: { total: 0, complete: 0 },
    },
  };
}

/** sprich (A1): a draft not approved, a change with REQ-031 to apply, one with everything applied. */
function sprich(addCouponsDone = false) {
  const list = {
    changes: [{ id: "draft-pedidos" }, { id: "add-coupons" }, { id: "fix-rounding" }],
    archived: 0,
  };
  const home = {
    requirements: [
      { id: "REQ-028", title: "Health", category: "DONE", needs: null },
      {
        id: "REQ-027",
        title: "Order lines",
        category: "NEEDS_TEST",
        needs: "its test",
        change: "draft-pedidos",
      },
      { id: "REQ-030", title: "A coupon", category: "DONE", needs: null, change: "add-coupons" },
      {
        id: "REQ-031",
        title: "A coupon once",
        category: addCouponsDone ? "DONE" : "NEEDS_TEST",
        needs: addCouponsDone ? null : "its test",
        change: "add-coupons",
      },
      {
        id: "REQ-040",
        title: "Round half up",
        category: "DONE",
        needs: null,
        change: "fix-rounding",
      },
    ],
  };
  const shows: Record<string, unknown> = {
    "draft-pedidos": show("draft-pedidos", { brief: "docs/brief.md" }, ["REQ-027 — Order lines"]),
    "add-coupons": show(
      "add-coupons",
      {},
      ["REQ-030 — A coupon", "REQ-031 — A coupon once"],
      "coupons",
    ),
    "fix-rounding": show("fix-rounding", {}, ["REQ-040 — Round half up"]),
  };
  return { list, home, shows };
}

const ids = (cards: Array<{ id: string }>) => cards.map((c) => c.id);

// ── REQ-081 ─────────────────────────────────────────────────────────────

test("REQ-081 SCN-241: sprich's changes — draft-pedidos to review, add-coupons in progress, fix-rounding ready to archive, one each", () => {
  const { list, home, shows } = sprich();
  const view = groupChanges(list, home, shows);
  assert.deepEqual(ids(view.groups.review), ["draft-pedidos"]);
  assert.deepEqual(ids(view.groups.progress), ["add-coupons"]);
  assert.deepEqual(ids(view.groups.ready), ["fix-rounding"]);
  const coupons = view.groups.progress[0]!;
  assert.deepEqual(coupons.toApply, ["REQ-031"]);
  assert.deepEqual(
    coupons.requirements.map((r) => [r.id, r.applied]),
    [
      ["REQ-030", true],
      ["REQ-031", false],
    ],
  );
  assert.equal(view.groups.review[0]!.draft, true);
});

test("REQ-081 SCN-242: add-coupons' last requirement applied — it moves to ready to archive", () => {
  const { list, home, shows } = sprich(true);
  const view = groupChanges(list, home, shows);
  assert.deepEqual(ids(view.groups.progress), []);
  assert.deepEqual(ids(view.groups.ready), ["add-coupons", "fix-rounding"]);
});

test("REQ-081: an approved draft is in progress; a change with no requirement yet is never ready to archive", () => {
  const { list, home, shows } = sprich();
  const approved = show("draft-pedidos", { brief: "docs/brief.md", approved: "2026-11-11" }, []);
  const empty = show("fix-rounding", {}, []);
  const view = groupChanges(
    list,
    { requirements: home.requirements.filter((r) => r.change !== "fix-rounding") },
    { ...shows, "draft-pedidos": approved, "fix-rounding": empty },
  );
  assert.deepEqual(ids(view.groups.review), []);
  assert.deepEqual(ids(view.groups.progress), ["draft-pedidos", "add-coupons", "fix-rounding"]);
  assert.equal(view.groups.progress[0]!.approved, "2026-11-11");
});

test("REQ-081: a change specgate cannot show is still listed, in progress — never offered for archive", () => {
  const { list, home, shows } = sprich();
  const view = groupChanges(list, home, { ...shows, "fix-rounding": null });
  assert.ok(view.groups.progress.some((c) => c.id === "fix-rounding"));
});

test("REQ-081: the Changes use case reads change list and status from the cached sections and each change with `change show`", async () => {
  const { list, home, shows } = sprich();
  const calls: string[] = [];
  const changes = new Changes(
    {
      call: async (args) => {
        calls.push(args.join(" "));
        return { data: shows[args[2]!], findings: [], exitCode: 0 };
      },
    },
    { section: async (s) => (s === "changes" ? list : home) },
  );
  const view = await changes.view();
  assert.deepEqual(ids(view.groups.ready), ["fix-rounding"]);
  assert.deepEqual(calls.sort(), [
    "change show add-coupons",
    "change show draft-pedidos",
    "change show fix-rounding",
  ]);
});

// ── REQ-084 ─────────────────────────────────────────────────────────────

/** `propose --from-ticket KAN-13 --check --json`, as specgate 0.33.1 answers it. */
const kan13: SpecgateAnswer = {
  data: {
    ticket: {
      key: "KAN-13",
      summary: "Register a vehicle entry",
      type: "Story",
      parent: null,
      labels: [],
      url: null,
      intent: "As an attendant I want to register a vehicle entry.",
      source: null,
      criteria: ["Given a plate, when it enters, then an entry is recorded with its time"],
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
};

test("REQ-084 SCN-247: on feature/parking/KAN-13 — the review says that branch, and Don't push yet runs --no-branch --no-push", () => {
  const r = ticketReview("KAN-13", kan13, "feature/parking/KAN-13");
  assert.equal(r.ticket?.summary, "Register a vehicle entry");
  assert.deepEqual(r.ticket?.criteria, [
    "Given a plate, when it enters, then an entry is recorded with its time",
  ]);
  assert.deepEqual(r.ticket?.questions, ["Does a motorbike pay the same?"]);
  assert.equal(r.ready, true);
  assert.equal(r.onBranch, "feature/parking/KAN-13");
  assert.deepEqual(commandLine(r.open.noPush)?.args, [
    "propose",
    "--from-ticket",
    "KAN-13",
    "--no-branch",
    "--no-push",
  ]);
  assert.deepEqual(commandLine(r.open.push)?.args, [
    "propose",
    "--from-ticket",
    "KAN-13",
    "--no-branch",
  ]);
  assert.equal(r.shown.noPush, "specgate propose --from-ticket KAN-13 --no-branch --no-push");
});

test("REQ-084: on another branch — specgate makes the ticket's branch: no --no-branch", () => {
  for (const branch of ["develop", "feature/parking/KAN-130", "feature/KAN-14-other", null]) {
    const r = ticketReview("KAN-13", kan13, branch);
    assert.equal(r.onBranch, null, String(branch));
    assert.deepEqual(commandLine(r.open.push)?.args, ["propose", "--from-ticket", "KAN-13"]);
  }
  assert.equal(
    ticketReview("KAN-13", kan13, "feature/KAN-13-register-vehicle").onBranch,
    "feature/KAN-13-register-vehicle",
  );
});

test("REQ-084: a ticket specgate cannot read — not ready, its finding kept, nothing to open", () => {
  const r = ticketReview(
    "KAN-13",
    {
      data: { ticket: null },
      findings: [
        { severity: "error", code: "ticket_unreadable", message: "alm.config.yaml not found" },
      ],
      exitCode: 1,
    },
    null,
  );
  assert.equal(r.ticket, null);
  assert.equal(r.ready, false);
  assert.equal(r.findings[0]?.code, "ticket_unreadable");
});

test("REQ-084: a ticket key is one argument and only a key — anything else is refused before specgate runs", () => {
  assert.equal(commandLine({ name: "propose-ticket-check", key: "--force" }), null);
  assert.equal(commandLine({ name: "propose-ticket", key: "KAN-13; rm -rf ." }), null);
  assert.deepEqual(commandLine({ name: "propose-ticket-check", key: "KAN-13" }), {
    args: ["propose", "--from-ticket", "KAN-13", "--check"],
    write: false,
    json: true,
  });
  assert.equal(commandLine({ name: "propose-ticket", key: "KAN-13" })?.write, true);
});

// ── REQ-085 ─────────────────────────────────────────────────────────────

/** A JSON port answering by arguments; the runner never runs. */
function jsonPort(answers: Record<string, SpecgateAnswer>) {
  const calls: string[][] = [];
  return {
    calls,
    port: {
      call: async (args: readonly string[]) => {
        calls.push([...args]);
        const a = answers[args.join(" ")];
        if (!a) throw new Error(`no answer for ${args.join(" ")}`);
        return structuredClone(a);
      },
    },
  };
}
const noRunner: ProcessRunner = {
  run: async () => {
    throw new Error("the runner must not run a JSON command");
  },
};

const writes = [
  { file: "docs/specs/capabilities/rounding/spec.md", kind: "spec" },
  { file: "features/rounding/REQ-040.feature", kind: "feature" },
  { file: "docs/specs/traceability.md", kind: "traceability" },
];
const archiveData = (dryRun: boolean) => ({
  archive: {
    change: "fix-rounding",
    archivedAs: "2026-11-11-fix-rounding",
    writes,
    deletes: [],
    warnings: [],
    ...(dryRun ? { dryRun: true } : {}),
  },
});

test("REQ-085 SCN-249: Archive — the preview runs `archive fix-rounding --dry-run`, writes nothing and lists what it would write; then the archive's notice names what it wrote", async () => {
  const fake = jsonPort({
    "archive fix-rounding --dry-run": { data: archiveData(true), findings: [], exitCode: 0 },
    "archive fix-rounding": { data: archiveData(false), findings: [], exitCode: 0 },
  });
  const commands = new Commands(noRunner, { json: fake.port });
  const events: CommandEvent[] = [];
  commands.onEvent((e) => events.push(e));

  const preview = await commands.run({ name: "archive-preview", change: "fix-rounding" });
  assert.ok(preview.ok);
  assert.deepEqual(preview.written, []);
  assert.deepEqual(
    preview.preview?.writes.map((w) => w.file),
    writes.map((w) => w.file),
  );
  assert.equal(
    events[0]?.type === "started" && events[0].command,
    "specgate archive fix-rounding --dry-run",
  );

  const archived = await commands.run({ name: "archive", change: "fix-rounding" });
  assert.ok(archived.ok);
  assert.deepEqual(fake.calls, [
    ["archive", "fix-rounding", "--dry-run"],
    ["archive", "fix-rounding"],
  ]);
  const ended = events.filter((e) => e.type === "ended").at(-1);
  assert.ok(ended?.type === "ended" && ended.notice);
  assert.equal(ended.notice.en.tone, "ok");
  assert.match(ended.notice.en.wrote, /docs\/specs\/capabilities\/rounding\/spec\.md/);
  assert.match(ended.notice.en.wrote, /features\/rounding\/REQ-040\.feature/);
  assert.match(ended.notice.es.ran, /specgate archive fix-rounding/);
  // The archived change is read again: the Changes section follows it.
  assert.ok(archived.written.includes("docs/specs/changes/archive/2026-11-11-fix-rounding/"));
});

test("REQ-085: a preview specgate refuses — archive_requirements_pending — carries the finding and no preview", async () => {
  const fake = jsonPort({
    "archive add-coupons --dry-run": {
      data: { archive: null },
      findings: [
        {
          severity: "error",
          code: "archive_requirements_pending",
          message: "Change 'add-coupons' has 1 requirement(s) not delivered yet: REQ-031.",
          target: "add-coupons",
          fix: "specgate apply REQ-031",
        },
      ],
      exitCode: 1,
    },
  });
  const commands = new Commands(noRunner, { json: fake.port });
  const r = await commands.run({ name: "archive-preview", change: "add-coupons" });
  assert.ok(r.ok);
  assert.equal(r.preview, undefined);
  assert.equal(r.findings?.[0]?.code, "archive_requirements_pending");
});

// ── REQ-086 and help REQ-063 SCN-186 ────────────────────────────────────

test("REQ-086 SCN-251: Apply on REQ-031 refused — `specgate apply REQ-031` ran with --json; the notice: apply_no_test, nothing written, the fix", async () => {
  const fake = jsonPort({
    "apply REQ-031": {
      data: { requirement: null },
      findings: [
        {
          severity: "error",
          code: "apply_no_test",
          message: "REQ-031 has no test that names it yet (TDD-1).",
          target: "REQ-031",
          fix: "write a test that names REQ-031 (and its scenario SCN-031), then run specgate apply REQ-031",
        },
      ],
      exitCode: 1,
    },
  });
  const commands = new Commands(noRunner, { json: fake.port });
  const events: CommandEvent[] = [];
  commands.onEvent((e) => events.push(e));
  const r = await commands.run({ name: "apply", req: "REQ-031" });
  assert.ok(r.ok);
  assert.equal(r.exitCode, 1);
  assert.deepEqual(r.written, []);
  assert.equal(r.findings?.[0]?.code, "apply_no_test");
  assert.equal(events[0]?.type === "started" && events[0].command, "specgate apply REQ-031");
  const out = events
    .filter((e) => e.type === "output")
    .map((e) => (e.type === "output" ? e.chunk : ""));
  assert.match(out.join(""), /apply_no_test/);
  const ended = events.at(-1);
  assert.ok(ended?.type === "ended" && ended.notice);
  const notices = ended.notice;
  for (const lang of ["en", "es"] as const) {
    const n = notices[lang];
    assert.equal(n.tone, "refused");
    assert.match(n.ran, /`specgate apply REQ-031`/);
    assert.match(n.ran, /apply_no_test/);
    assert.match(n.fix ?? "", /write a test that names REQ-031/);
  }
  assert.equal(ended.notice.en.wrote, "Nothing was written.");
});

test("REQ-086 SCN-252: Apply on REQ-030 passes — Implemented; the notice names the delta it wrote and the next step", async () => {
  const fake = jsonPort({
    "apply REQ-030": {
      data: { requirement: { id: "REQ-030", status: "Implemented", rowsUpdated: 1 } },
      findings: [],
      exitCode: 0,
    },
  });
  const commands = new Commands(noRunner, {
    json: fake.port,
    written: async (c) =>
      c.name === "apply" ? ["docs/specs/changes/add-coupons/specs/coupons/spec.md"] : [],
  });
  const events: CommandEvent[] = [];
  commands.onEvent((e) => events.push(e));
  const r = await commands.run({ name: "apply", req: "REQ-030" });
  assert.ok(r.ok);
  assert.deepEqual(r.written, ["docs/specs/changes/add-coupons/specs/coupons/spec.md"]);
  const ended = events.at(-1);
  assert.ok(ended?.type === "ended" && ended.notice);
  assert.equal(ended.notice.en.tone, "ok");
  assert.match(ended.notice.en.ran, /marked REQ-030 Implemented/);
  assert.match(
    ended.notice.en.wrote,
    /docs\/specs\/changes\/add-coupons\/specs\/coupons\/spec\.md/,
  );
  assert.equal(ended.notice.en.next, "specgate status");
});

test("REQ-086: the Changes use case says which file Apply wrote — the delta of the change that holds the requirement", async () => {
  const { list, home, shows } = sprich();
  const changes = new Changes(
    { call: async (args) => ({ data: shows[args[2]!], findings: [], exitCode: 0 }) },
    { section: async (s) => (s === "changes" ? list : home) },
  );
  assert.deepEqual(await changes.written({ name: "apply", req: "REQ-031" }), [
    "docs/specs/changes/add-coupons/specs/coupons/spec.md",
  ]);
  assert.deepEqual(await changes.written({ name: "apply", req: "REQ-999" }), []);
});

test("REQ-086: without a JSON port, Apply runs as before — streamed, with no notice it cannot know", async () => {
  const events: CommandEvent[] = [];
  const commands = new Commands({ run: async (_a, out) => (out("✖ no test\n"), 1) });
  commands.onEvent((e) => events.push(e));
  await commands.run({ name: "apply", req: "REQ-031" });
  const ended = events.at(-1);
  assert.equal(ended?.type === "ended" && ended.notice, undefined);
});

test("REQ-085 REQ-086: a change id or requirement that is not one is refused before specgate runs", async () => {
  assert.equal(commandLine({ name: "archive-preview", change: "--force" }), null);
  assert.equal(commandLine({ name: "change-show", change: "../x" }), null);
  assert.deepEqual(commandLine({ name: "change-show", change: "add-coupons" }), {
    args: ["change", "show", "add-coupons"],
    write: false,
    json: true,
  });
});

// ── help for the new actions ────────────────────────────────────────────

test('REQ-085: "Preview the archive" has its "?" in English and Spanish, and every action still has both', () => {
  assert.deepEqual(missingTranslations(HELP), []);
  const en = explain("archive-preview", "en", { change: "fix-rounding" });
  assert.equal(en.command, "specgate archive fix-rounding --dry-run");
  assert.match(en.files, /writes nothing/);
  assert.match(en.doesNot, /only when you confirm/);
  assert.match(explain("archive-preview", "es", { change: "fix-rounding" }).does, /fix-rounding/);
  const ticket = explain("propose-ticket", "en", { key: "KAN-13" });
  assert.match(ticket.does, /KAN-13/);
});
