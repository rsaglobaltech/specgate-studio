/**
 * draft-workspace — the open folder in the core, through its ports, against
 * the in-memory fakes (REQ-021 … REQ-026). The Node adapters pass the same
 * contracts in packages/adapter-node.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  ANY_FILE,
  SECTIONS,
  sectionsFedBy,
  FILE_SYSTEM_CONTRACT,
  FOLDER_KIND_LABEL,
  GIT_CONTRACT,
  IgnoreRules,
  InMemoryFileSystem,
  InMemoryGit,
  InMemoryStore,
  InMemoryWatcher,
  RecentProjects,
  STORE_CONTRACT,
  SteppingClock,
  WATCHER_CONTRACT,
  Workspace,
  branchTicket,
  groupUncommitted,
  withOpened,
} from "../src/index.js";

const SPRICH = "/home/dev/sprich";

// ── REQ-021: empty, code, or a specgate project ──────────────────────────

test("REQ-021 SCN-061: sprich, which holds docs/specs/traceability.md, is a Specgate project", async () => {
  const fs = new InMemoryFileSystem({ [`${SPRICH}/docs/specs/traceability.md`]: "# T\n" });
  const ws = await Workspace.open(SPRICH, fs, new InMemoryGit());
  const state = await ws.state();
  assert.equal(state.kind, "specgate");
  assert.equal(FOLDER_KIND_LABEL[state.kind], "Specgate project");
  assert.equal(state.name, "sprich");
});

test("REQ-021 SCN-062: nuevo, which holds nothing but .git, is an Empty folder", async () => {
  const fs = new InMemoryFileSystem({}, ["/home/dev/nuevo/.git"]);
  const state = await (await Workspace.open("/home/dev/nuevo", fs, new InMemoryGit())).state();
  assert.equal(state.kind, "empty");
  assert.equal(FOLDER_KIND_LABEL[state.kind], "Empty folder");
});

test("REQ-021: a folder with code and no traceability.md is Code, no specgate project", async () => {
  const fs = new InMemoryFileSystem({ "/home/dev/app/package.json": "{}" });
  const state = await (await Workspace.open("/home/dev/app", fs, new InMemoryGit())).state();
  assert.equal(FOLDER_KIND_LABEL[state.kind], "Code, no specgate project");
});

// ── REQ-022: node_modules, .git and build output never watched or counted ──

test("REQ-022 SCN-063: files written under node_modules are not counted as uncommitted", () => {
  const rules = new IgnoreRules();
  const before = groupUncommitted(["spec.md"], rules);
  const after = groupUncommitted(["spec.md", "node_modules/left-pad/index.js"], rules);
  assert.deepEqual(after, before);
});

test("REQ-022 SCN-064: apps/web/dist written by a build is ignored, and no section is read again", async () => {
  const watcher = new InMemoryWatcher();
  const fs = new InMemoryFileSystem({ [`${SPRICH}/spec.md`]: "# S\n" });
  const ws = await Workspace.open(SPRICH, fs, new InMemoryGit());
  const files: string[] = [];
  const watch = await ws.watch(
    watcher,
    (p) => files.push(p),
    () => undefined,
  );
  watcher.emit(SPRICH, "apps/web/dist/index.js");
  watcher.emit(SPRICH, "apps/web/.next/cache/x");
  watcher.emit(SPRICH, ".git/index");
  assert.deepEqual(files, []);
  await watch.close();
});

test("REQ-022: the folders .gitignore names are ignored too; wildcards and negations are left to git", () => {
  const rules = new IgnoreRules("# build\r\n.turbo\n/tmp/\nlogs/*.log\n!keep\npackages/gen/\n");
  assert.ok(rules.ignores("apps/web/.turbo/x"));
  assert.ok(rules.ignores("tmp/a"));
  assert.ok(!rules.ignores("apps/tmp/a"), "an anchored path only from the root");
  assert.ok(rules.ignores("packages/gen/a.ts"));
  assert.ok(!rules.ignores("logs/a.log"));
  assert.ok(rules.ignores("services/api/target/classes/A.class"));
  assert.ok(!rules.ignores("docs/specs/traceability.md"));
});

// ── REQ-023: a saved file reaches the host at once ───────────────────────

test("REQ-023: a saved file is told to the host as it is saved, and the state follows once the saves settle", async () => {
  const watcher = new InMemoryWatcher();
  const git = new InMemoryGit({ [SPRICH]: { branch: "main", uncommitted: [] } });
  const ws = await Workspace.open(SPRICH, new InMemoryFileSystem(), git);
  const files: string[] = [];
  const states: number[] = [];
  const watch = await ws.watch(
    watcher,
    (p) => files.push(p),
    (s) => states.push(s.git!.total),
    5,
  );
  git.set(SPRICH, { branch: "main", uncommitted: ["spec.md"] });
  watcher.emit(SPRICH, "spec.md");
  watcher.emit(SPRICH, "spec.md");
  assert.deepEqual(files, ["spec.md", "spec.md"], "told at once");
  await new Promise((r) => setTimeout(r, 40));
  assert.deepEqual(states, [1], "one state for the burst");
  await watch.close();
});

test("REQ-023: a change whose path the system lost is told as ANY_FILE, reads every section again, and the state follows", async () => {
  const watcher = new InMemoryWatcher();
  const git = new InMemoryGit({ [SPRICH]: { branch: "main", uncommitted: [] } });
  const ws = await Workspace.open(SPRICH, new InMemoryFileSystem(), git);
  const files: string[] = [];
  const states: number[] = [];
  const watch = await ws.watch(
    watcher,
    (p) => files.push(p),
    (s) => states.push(s.git!.total),
    5,
  );
  git.set(SPRICH, { branch: "main", uncommitted: ["README.md"] });
  watcher.emit(SPRICH, ANY_FILE);
  assert.deepEqual(files, [ANY_FILE]);
  assert.deepEqual(sectionsFedBy(ANY_FILE), [...SECTIONS]);
  await new Promise((r) => setTimeout(r, 40));
  assert.deepEqual(states, [1]);
  await watch.close();
});

test("REQ-023: closing the watch waits for the state read in flight, so no git read outlives it", async () => {
  const watcher = new InMemoryWatcher();
  let ended = false;
  const slowGit = {
    branch: async () => "main",
    uncommitted: async () => {
      await new Promise((r) => setTimeout(r, 80));
      ended = true;
      return [];
    },
  };
  const ws = await Workspace.open(SPRICH, new InMemoryFileSystem(), slowGit);
  const watch = await ws.watch(
    watcher,
    () => undefined,
    () => undefined,
    1,
  );
  watcher.emit(SPRICH, "spec.md");
  await new Promise((r) => setTimeout(r, 10));
  await watch.close();
  assert.equal(ended, true, "close waited for git");
});

// ── REQ-024: the branch, and the team and ticket it names ────────────────

test("REQ-024 SCN-067: feature/pagos/SPR-42 names the team pagos and the ticket SPR-42", async () => {
  assert.deepEqual(branchTicket("feature/pagos/SPR-42"), { team: "pagos", ticket: "SPR-42" });
  const git = new InMemoryGit({ [SPRICH]: { branch: "feature/pagos/SPR-42", uncommitted: [] } });
  const state = await (await Workspace.open(SPRICH, new InMemoryFileSystem(), git)).state();
  assert.deepEqual(
    { branch: state.git?.branch, team: state.git?.team, ticket: state.git?.ticket },
    { branch: "feature/pagos/SPR-42", team: "pagos", ticket: "SPR-42" },
  );
});

test("REQ-024 SCN-068: feat/mvp-fase-1 shows the branch alone, no team and no ticket", async () => {
  for (const b of ["feat/mvp-fase-1", "feature/pagos", "feature/pagos/spr-42", "main", null]) {
    assert.equal(branchTicket(b), null, String(b));
  }
  const git = new InMemoryGit({ [SPRICH]: { branch: "feat/mvp-fase-1", uncommitted: [] } });
  const state = await (await Workspace.open(SPRICH, new InMemoryFileSystem(), git)).state();
  assert.deepEqual(
    { branch: state.git?.branch, team: state.git?.team, ticket: state.git?.ticket },
    { branch: "feat/mvp-fase-1", team: null, ticket: null },
  );
});

// ── REQ-025: the uncommitted files by folder ─────────────────────────────

/** sprich's 325 uncommitted files: 129 packages/core, 96 apps/web, 84 of the specification, 16 more. */
export function sprich325(): string[] {
  const files: string[] = [];
  for (let i = 0; i < 129; i++) files.push(`packages/core/src/f${i}.ts`);
  for (let i = 0; i < 96; i++) files.push(`apps/web/src/c${i}.tsx`);
  files.push("spec.md");
  for (let i = 0; i < 50; i++) files.push(`docs/specs/changes/draft-pedidos/n${i}.md`);
  for (let i = 0; i < 33; i++) files.push(`features/pedidos/REQ-${100 + i}.feature`);
  for (let i = 0; i < 16; i++) files.push(`tools/scripts/s${i}.mjs`);
  return files;
}

for (const [scn, where] of [
  ["SCN-069", "on the desktop"],
  ["SCN-070", "in the browser"],
] as const) {
  test(`REQ-025 ${scn}: sprich's 325 uncommitted files ${where} — packages/core 129, apps/web 96, the specification 84`, async () => {
    const git = new InMemoryGit({ [SPRICH]: { branch: "main", uncommitted: sprich325() } });
    const state = await (await Workspace.open(SPRICH, new InMemoryFileSystem(), git)).state();
    assert.equal(state.git?.total, 325);
    assert.deepEqual(state.git?.uncommitted.slice(0, 3), [
      { group: "packages/core", files: 129 },
      { group: "apps/web", files: 96 },
      { group: "specification", files: 84 },
    ]);
  });
}

test("REQ-025: Windows separators are grouped like /, and a file at the root is in the group .", () => {
  assert.deepEqual(groupUncommitted(["packages\\core\\a.ts", "README.md"]), {
    uncommitted: [
      { group: ".", files: 1 },
      { group: "packages/core", files: 1 },
    ],
    total: 2,
  });
});

test("REQ-025: outside a git repository there is no git state", async () => {
  const state = await (
    await Workspace.open(SPRICH, new InMemoryFileSystem(), new InMemoryGit())
  ).state();
  assert.equal(state.git, null);
});

// ── REQ-026: the last 10 projects ────────────────────────────────────────

test("REQ-026 SCN-071: after 10 projects, sprich last, billing comes first, sprich second, the earliest no longer listed", async () => {
  const recent = new RecentProjects(new InMemoryStore(), new SteppingClock(), false);
  for (let i = 1; i <= 9; i++) await recent.opened(`/home/dev/p${i}`);
  await recent.opened("/home/dev/sprich");
  const list = await recent.opened("/home/dev/billing");
  assert.equal(list.length, 10);
  assert.deepEqual(
    list.slice(0, 2).map((r) => r.name),
    ["billing", "sprich"],
  );
  assert.ok(!list.some((r) => r.name === "p1"), "the earliest is gone");
});

test("REQ-026 SCN-072: picking sprich again brings it first, listed once", async () => {
  const recent = new RecentProjects(new InMemoryStore(), new SteppingClock(), false);
  await recent.opened("/home/dev/sprich");
  await recent.opened("/home/dev/billing");
  const list = await recent.opened("/home/dev/sprich");
  assert.deepEqual(
    list.map((r) => r.name),
    ["sprich", "billing"],
  );
});

test("REQ-026: on Windows and macOS the same folder in another case is one project", () => {
  const once = withOpened([], "C:/Users/dev/Sprich", "t1", true);
  assert.equal(withOpened(once, "c:\\users\\dev\\sprich", "t2", true).length, 1);
  assert.equal(withOpened(once, "C:/Users/dev/sprich", "t2", false).length, 2);
});

// ── The ports' contracts, against the fakes ──────────────────────────────

for (const check of FILE_SYSTEM_CONTRACT) {
  test(`REQ-021: the in-memory file system — ${check.name}`, () =>
    check.run(async (files) => {
      const fs = new InMemoryFileSystem();
      for (const [p, t] of Object.entries(files)) fs.write(`/r/${p}`, t);
      return { port: fs, root: "/r" };
    }));
}

for (const check of GIT_CONTRACT) {
  test(`REQ-025: the in-memory git — ${check.name}`, () =>
    check.run(async (repo) => ({
      port: new InMemoryGit({ "/r": repo }),
      root: "/r",
      notARepo: "/elsewhere",
    })));
}

for (const check of WATCHER_CONTRACT) {
  test(`REQ-023: the in-memory watcher — ${check.name}`, () =>
    check.run(async () => {
      const port = new InMemoryWatcher();
      return { port, root: "/r", write: async (p) => port.emit("/r", p) };
    }));
}

for (const check of STORE_CONTRACT) {
  test(`REQ-026: the in-memory store — ${check.name}`, () =>
    check.run(async () => new InMemoryStore()));
}

test("REQ-024: the in-memory git finds a repository given with Windows separators, as the Node adapter does", async () => {
  const git = new InMemoryGit({
    "C:\\Users\\dev\\sprich": { branch: "feat/mvp-fase-1", uncommitted: [] },
  });
  assert.equal(await git.branch("C:\\Users\\dev\\sprich"), "feat/mvp-fase-1");
  assert.equal(await git.branch("C:/Users/dev/sprich"), "feat/mvp-fase-1");
});
