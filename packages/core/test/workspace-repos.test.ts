/**
 * workspace-repos — a specgate 1.0 workspace in the studio (REQ-218): the
 * folder's kind, and its repositories from `workspace status --json`.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { WORKSPACE_MARKER, folderKind, joinPath, setupStep, workspaceOf } from "../src/index.js";

const STATUS = {
  workspace: {
    schemaVersion: 1,
    name: "truck",
    dir: "/work/truck-workspace",
    repos: [
      {
        name: "fleet",
        role: "service",
        path: "../truck-fleet",
        url: "https://github.com/acme/truck-fleet.git",
        exists: true,
        branch: "develop",
        requirements: { total: 10, done: 3, pending: 7 },
        gate: { state: "passed", at: "2026-11-14T10:00:00Z" },
      },
      {
        name: "web",
        role: "web",
        path: "../truck-web",
        url: "https://github.com/acme/truck-web.git",
        exists: false,
        branch: null,
        requirements: null,
        gate: { state: "not run", at: null },
      },
    ],
    stories: [{ id: "track-a-truck" }],
  },
};

test("REQ-218: a folder with specgate.workspace.yaml and no spec of its own is a workspace — nothing to adopt", () => {
  assert.equal(WORKSPACE_MARKER, "specgate.workspace.yaml");
  assert.equal(folderKind([".git", "specgate.workspace.yaml", "docs"], false), "workspace");
  assert.equal(setupStep("workspace"), null);
  // A workspace that is a specgate project too stays one.
  assert.equal(folderKind(["specgate.workspace.yaml", "docs"], true), "specgate");
  assert.equal(folderKind(["src", "package.json"], false), "code");
});

test("REQ-218 SCN-981: truck's repositories — fleet 3 of 10 with its gate, web not cloned, with where to clone it from", () => {
  const view = workspaceOf(STATUS, "/work/truck-workspace")!;
  assert.equal(view.name, "truck");
  assert.equal(view.stories, 1);
  assert.deepEqual(view.repos[0], {
    name: "fleet",
    role: "service",
    path: "../truck-fleet",
    dir: "/work/truck-fleet",
    url: "https://github.com/acme/truck-fleet.git",
    exists: true,
    branch: "develop",
    requirements: { total: 10, done: 3 },
    gate: "passed",
  });
  assert.equal(view.repos[1]!.exists, false);
  assert.equal(view.repos[1]!.requirements, null);
  assert.equal(view.repos[1]!.url, "https://github.com/acme/truck-web.git");
});

test("REQ-218: a repository's folder from the workspace's, with `/` on every system", () => {
  assert.equal(joinPath("/work/truck-workspace", "../truck-fleet"), "/work/truck-fleet");
  assert.equal(joinPath("C:/work/truck-workspace", "..\\truck-web"), "C:/work/truck-web");
  assert.equal(joinPath("/work/ws", "./repos/fleet/"), "/work/ws/repos/fleet");
  assert.equal(joinPath("/work/ws", "/srv/fleet"), "/srv/fleet");
  assert.equal(workspaceOf({ total: 3 }, "/work"), null);
  assert.equal(workspaceOf(null, "/work"), null);
});
