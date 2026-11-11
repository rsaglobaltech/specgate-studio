/**
 * draft-workspace — the Node adapters of the workspace's ports, on real
 * folders and repositories: the same contracts as the fakes, then the
 * scenarios (REQ-021 … REQ-026).
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  ANY_FILE,
  FILE_SYSTEM_CONTRACT,
  FOLDER_KIND_LABEL,
  GIT_CONTRACT,
  GIT_WRITER_CONTRACT,
  RecentProjects,
  STORE_CONTRACT,
  SteppingClock,
  WATCHER_CONTRACT,
  Workspace,
} from "@specgate-studio/core";
import {
  NodeFileSystem,
  NodeGit,
  NodeStore,
  NodeWatcher,
  caseInsensitivePaths,
  studioHome,
} from "../src/index.js";
import { gitIn, repo, rm, tmp, until, write } from "./helpers.js";

const nodeWorkspace = (root: string) => Workspace.open(root, new NodeFileSystem(), new NodeGit());

// ── The contracts, against the Node adapters ─────────────────────────────

for (const check of FILE_SYSTEM_CONTRACT) {
  test(`REQ-021: the Node file system — ${check.name}`, async () => {
    const root = tmp("sg-ws-fs-");
    try {
      await check.run(async (files) => {
        for (const [p, t] of Object.entries(files)) write(root, p, t);
        return { port: new NodeFileSystem(), root };
      });
    } finally {
      await rm(root);
    }
  });
}

for (const check of GIT_CONTRACT) {
  test(`REQ-025: the Node git — ${check.name}`, async () => {
    const root = tmp("sg-ws-git-");
    const plain = tmp("sg-ws-plain-");
    try {
      await check.run(async ({ branch, uncommitted }) => {
        repo(root, branch);
        for (const f of uncommitted) write(root, f);
        return { port: new NodeGit(), root, notARepo: plain };
      });
    } finally {
      await rm(root);
      await rm(plain);
    }
  });
}

for (const check of GIT_WRITER_CONTRACT) {
  test(`REQ-102: the Node git — ${check.name}`, async () => {
    const root = tmp("sg-build-git-");
    try {
      await check.run(async ({ committed, uncommitted, deleted }) => {
        repo(root, "main", committed);
        // The person's identity, as their git config gives it.
        gitIn(root, "config", "user.name", "Dev");
        gitIn(root, "config", "user.email", "dev@example.com");
        gitIn(root, "config", "commit.gpgsign", "false");
        for (const f of uncommitted) write(root, f, `changed ${f}\n`);
        for (const f of deleted) fs.rmSync(path.join(root, f));
        return { port: new NodeGit(), root };
      });
    } finally {
      await rm(root);
    }
  });
}

for (const check of WATCHER_CONTRACT) {
  test(`REQ-023: the Node watcher — ${check.name}`, async () => {
    const root = tmp("sg-ws-watch-");
    write(root, "spec.md", "# S\n");
    write(root, "docs/specs/changes/draft-pedidos/proposal.md");
    write(root, "node_modules/left-pad/package.json", "{}");
    try {
      await check.run(async () => ({
        port: new NodeWatcher(),
        root,
        write: async (p) => {
          // Let the watch settle before the first write (FSEvents starts asynchronously).
          await new Promise((r) => setTimeout(r, 100));
          write(root, p, `saved ${Date.now()}\n`);
        },
      }));
    } finally {
      await rm(root);
    }
  });
}

for (const check of STORE_CONTRACT) {
  test(`REQ-026: the Node store — ${check.name}`, async () => {
    const home = tmp("sg-ws-home-");
    try {
      await check.run(async () => new NodeStore(home));
    } finally {
      await rm(home);
    }
  });
}

// ── REQ-021 ──────────────────────────────────────────────────────────────

test("REQ-021 SCN-061: the folder sprich with docs/specs/traceability.md reads Specgate project", async () => {
  const parent = tmp("sg-ws-061-");
  const sprich = `${parent}/sprich`;
  write(sprich, "docs/specs/traceability.md", "# Traceability\n");
  try {
    const state = await (await nodeWorkspace(sprich)).state();
    assert.equal(FOLDER_KIND_LABEL[state.kind], "Specgate project");
    assert.equal(state.name, "sprich");
  } finally {
    await rm(parent);
  }
});

test("REQ-021 SCN-062: the folder nuevo with nothing but .git reads Empty folder", async () => {
  const parent = tmp("sg-ws-062-");
  const nuevo = `${parent}/nuevo`;
  fs.mkdirSync(path.join(nuevo, ".git"), { recursive: true });
  try {
    const state = await (await nodeWorkspace(nuevo)).state();
    assert.equal(FOLDER_KIND_LABEL[state.kind], "Empty folder");
  } finally {
    await rm(parent);
  }
});

// ── REQ-022 ──────────────────────────────────────────────────────────────

test("REQ-022 SCN-063: npm install writing node_modules changes neither the uncommitted files nor what the watcher tells", async () => {
  const root = tmp("sg-ws-063-");
  repo(root, "main", ["README.md", "package.json"]);
  try {
    const ws = await nodeWorkspace(root);
    const before = (await ws.state()).git;
    const told: string[] = [];
    const watch = await ws.watch(
      new NodeWatcher(),
      (p) => told.push(p),
      () => undefined,
    );
    try {
      await new Promise((r) => setTimeout(r, 100));
      for (let i = 0; i < 20; i++) write(root, `node_modules/dep${i}/index.js`);
      write(root, "node_modules/.package-lock.json", "{}");
      write(root, "README.md", "# changed\n");
      // README.md is told by name — or, when the burst overflowed the system's
      // buffer (Windows), as ANY_FILE, and the state is read again.
      assert.ok(
        await until(() => told.includes("README.md") || told.includes(ANY_FILE), 3000),
        `README.md told — told ${JSON.stringify(told.slice(0, 20))}`,
      );
      await new Promise((r) => setTimeout(r, 100));
    } finally {
      await watch.close();
    }
    assert.deepEqual(
      told.filter((p) => p.startsWith("node_modules")),
      [],
    );
    const after = (await ws.state()).git;
    assert.equal(after?.total, (before?.total ?? 0) + 1, "only README.md is new");
    assert.ok(!after?.uncommitted.some((g) => g.group.startsWith("node_modules")));
  } finally {
    await rm(root);
  }
});

test("REQ-022 SCN-064: a build writing apps/web/dist is never told to the host", async () => {
  const root = tmp("sg-ws-064-");
  write(root, "apps/web/src/main.ts");
  write(root, "spec.md");
  try {
    const ws = await nodeWorkspace(root);
    const told: string[] = [];
    const watch = await ws.watch(
      new NodeWatcher(),
      (p) => told.push(p),
      () => undefined,
    );
    try {
      await new Promise((r) => setTimeout(r, 100));
      for (let i = 0; i < 10; i++) write(root, `apps/web/dist/assets/chunk${i}.js`);
      write(root, "apps/web/src/main.ts", "changed\n");
      assert.ok(
        await until(() => told.includes("apps/web/src/main.ts"), 3000),
        `main.ts told — told ${JSON.stringify(told.slice(0, 20))}`,
      );
      await new Promise((r) => setTimeout(r, 100));
    } finally {
      await watch.close();
    }
    assert.deepEqual(
      told.filter((p) => p.includes("/dist")),
      [],
    );
  } finally {
    await rm(root);
  }
});

// ── REQ-024 ──────────────────────────────────────────────────────────────

test("REQ-024 SCN-067: sprich on feature/pagos/SPR-42 shows the team pagos and the ticket SPR-42", async () => {
  const root = tmp("sg-ws-067-");
  repo(root, "feature/pagos/SPR-42");
  try {
    const git = (await (await nodeWorkspace(root)).state()).git;
    assert.deepEqual(
      { branch: git?.branch, team: git?.team, ticket: git?.ticket },
      { branch: "feature/pagos/SPR-42", team: "pagos", ticket: "SPR-42" },
    );
  } finally {
    await rm(root);
  }
});

test("REQ-024 SCN-068: sprich on feat/mvp-fase-1 shows the branch alone", async () => {
  const root = tmp("sg-ws-068-");
  repo(root, "feat/mvp-fase-1");
  try {
    const git = (await (await nodeWorkspace(root)).state()).git;
    assert.deepEqual(
      { branch: git?.branch, team: git?.team, ticket: git?.ticket },
      { branch: "feat/mvp-fase-1", team: null, ticket: null },
    );
  } finally {
    await rm(root);
  }
});

// ── REQ-025 ──────────────────────────────────────────────────────────────

test("REQ-025 SCN-069: a repository with sprich's 325 uncommitted files — packages/core 129, apps/web 96, the specification 84", async () => {
  const root = tmp("sg-ws-069-");
  repo(root, "feat/mvp-fase-1", ["README.md", "spec.md", "docs/specs/traceability.md"]);
  try {
    write(root, "spec.md", "# changed\n"); // modified
    for (let i = 0; i < 129; i++) write(root, `packages/core/src/f${i}.ts`);
    for (let i = 0; i < 96; i++) write(root, `apps/web/src/c${i}.tsx`);
    for (let i = 0; i < 50; i++) write(root, `docs/specs/changes/draft-pedidos/n${i}.md`);
    for (let i = 0; i < 33; i++) write(root, `features/pedidos/REQ-${100 + i}.feature`);
    for (let i = 0; i < 16; i++) write(root, `tools/scripts/s${i}.mjs`);
    const git = (await (await nodeWorkspace(root)).state()).git;
    assert.equal(git?.total, 325);
    assert.deepEqual(git?.uncommitted.slice(0, 3), [
      { group: "packages/core", files: 129 },
      { group: "apps/web", files: 96 },
      { group: "specification", files: 84 },
    ]);
  } finally {
    await rm(root);
  }
});

test("REQ-025: a rename counts once, under its new name, and a name with spaces and accents is kept", async () => {
  const root = tmp("sg-ws-ren-");
  repo(root, "main", ["old name.md"]);
  try {
    const { spawnSync } = await import("node:child_process");
    fs.mkdirSync(path.join(root, "docs"));
    const mv = spawnSync("git", ["mv", "old name.md", "docs/nueva canción.md"], { cwd: root });
    assert.equal(mv.status, 0, String(mv.stderr));
    const files = await new NodeGit().uncommitted(root);
    assert.deepEqual(files, ["docs/nueva canción.md"]);
  } finally {
    await rm(root);
  }
});

// ── REQ-026 ──────────────────────────────────────────────────────────────

test("REQ-026 SCN-071: the recent projects kept in the studio's settings folder — billing first, sprich second, 10 at most", async () => {
  const home = tmp("sg-ws-071-");
  try {
    const recent = new RecentProjects(new NodeStore(home), new SteppingClock(), false);
    for (let i = 1; i <= 9; i++) await recent.opened(`/home/dev/p${i}`);
    await recent.opened("/home/dev/sprich");
    await recent.opened("/home/dev/billing");
    // A new session reads the same list from disk.
    const again = await new RecentProjects(new NodeStore(home), new SteppingClock(), false).list();
    assert.equal(again.length, 10);
    assert.deepEqual(
      again.slice(0, 2).map((r) => r.name),
      ["billing", "sprich"],
    );
    assert.ok(!again.some((r) => r.name === "p1"));
    assert.ok(fs.existsSync(path.join(home, "recent-projects.json")));
  } finally {
    await rm(home);
  }
});

test("REQ-026: the settings folder of each system, and SPECGATE_STUDIO_HOME over it", () => {
  assert.equal(
    studioHome({ APPDATA: "C:\\Users\\dev\\AppData\\Roaming" }, "win32", "C:\\Users\\dev"),
    path.join("C:\\Users\\dev\\AppData\\Roaming", "specgate-studio"),
  );
  assert.equal(
    studioHome({}, "darwin", "/Users/dev"),
    path.join("/Users/dev", "Library", "Application Support", "specgate-studio"),
  );
  assert.equal(
    studioHome({}, "linux", "/home/dev"),
    path.join("/home/dev", ".config", "specgate-studio"),
  );
  assert.equal(
    studioHome({ XDG_CONFIG_HOME: "/x" }, "linux", "/home/dev"),
    path.join("/x", "specgate-studio"),
  );
  assert.equal(studioHome({ SPECGATE_STUDIO_HOME: "/t" }, "linux", "/home/dev"), "/t");
  assert.equal(caseInsensitivePaths("win32"), true);
  assert.equal(caseInsensitivePaths("darwin"), true);
  assert.equal(caseInsensitivePaths("linux"), false);
});
