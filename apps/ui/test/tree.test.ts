/**
 * draft-explorer-tree — the tree's rows without a browser: the open folders
 * in VS Code's order (REQ-161), the filter inside the tree (REQ-167), file
 * types and the specification marked (REQ-162), dots on folders (REQ-163),
 * the folders above a file to reveal it (REQ-164), modules (REQ-169).
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  changedFolders,
  fileType,
  filteredRows,
  foldersAbove,
  isSpec,
  modulesOf,
  visibleRows,
} from "../src/tree.js";

const e = (path: string, dir = false) => ({ name: path.split("/").pop()!, path, dir });

test("REQ-161 SCN-481: an open folder's children under it; a closed one's not shown", () => {
  const children = new Map([
    ["", [e("packages", true), e("spec.md")]],
    ["packages", [e("packages/core", true), e("packages/ui", true)]],
    ["packages/core", [e("packages/core/src", true), e("packages/core/package.json")]],
  ]);
  const rows = visibleRows(new Set(["packages", "packages/core"]), children);
  assert.deepEqual(
    rows.map((r) => `${"  ".repeat(r.depth)}${r.entry.name}`),
    ["packages", "  core", "    src", "    package.json", "  ui", "spec.md"],
  );
  // packages/core closed: its children go.
  assert.equal(visibleRows(new Set(["packages"]), children).length, 4);
});

test("REQ-167 SCN-497: REQ-031 shows its two files inside their opened folders, nothing else", () => {
  const files = [
    "features/pedidos/REQ-031.feature",
    "features/pedidos/REQ-032.feature",
    "test/pedidos/REQ-031.test.ts",
    "packages/core/index.ts",
  ];
  const rows = filteredRows(files, "req-031");
  assert.deepEqual(
    rows.map((r) => r.entry.path),
    [
      "features",
      "features/pedidos",
      "features/pedidos/REQ-031.feature",
      "test",
      "test/pedidos",
      "test/pedidos/REQ-031.test.ts",
    ],
  );
  assert.deepEqual(filteredRows(files, "  "), []);
});

test("REQ-162: file types as the boards' badges; spec.md, docs/specs and features marked", () => {
  assert.equal(fileType("brief.md"), "MD");
  assert.equal(fileType("REQ-031.feature"), "FT");
  assert.equal(fileType("Cancel.test.ts"), "TS");
  assert.equal(fileType("package.json"), "JSON");
  assert.equal(fileType("LICENSE"), null);
  for (const p of ["spec.md", "docs/specs", "docs/specs/traceability.md", "features/a.feature"])
    assert.ok(isSpec(p), p);
  for (const p of ["docs/brief.md", "src/spec.md", "docs/specsx"]) assert.ok(!isSpec(p), p);
});

test("REQ-163 SCN-486: docs and src hold a change and get a dot", () => {
  const dots = changedFolders({ "docs/brief.md": "M", "docs/notes.md": "U", "src/cart.ts": "A" });
  assert.deepEqual([...dots].sort(), ["docs", "src"]);
});

test("REQ-164 SCN-488: the folders to open to reveal a spec", () => {
  assert.deepEqual(foldersAbove("docs/specs/changes/draft-pedidos/specs/pedidos/spec.md"), [
    "docs",
    "docs/specs",
    "docs/specs/changes",
    "docs/specs/changes/draft-pedidos",
    "docs/specs/changes/draft-pedidos/specs",
    "docs/specs/changes/draft-pedidos/specs/pedidos",
  ]);
});

test("REQ-169 SCN-502: pedidos from its change, auth from its features; REQ-031 waits, amber", () => {
  const modules = modulesOf(
    [
      { id: "REQ-010", title: "Sign in", category: "DONE" },
      { id: "REQ-012", title: "Sign out", category: "NEEDS_EVERYTHING" },
      { id: "REQ-031", title: "Cancel", category: "WAITING_FOR_ANSWER", change: "draft-pedidos" },
      { id: "REQ-032", title: "State", category: "NEEDS_EVERYTHING", change: "draft-pedidos" },
    ],
    {
      requirements: [
        { requirement: "REQ-010", featureFile: "`features/auth/REQ-010.feature`" },
        { requirement: "REQ-012", featureFile: "`features/auth/REQ-012.feature`" },
      ],
    },
    { building: "REQ-012", unapproved: new Set(["draft-pedidos"]) },
  );
  assert.deepEqual(
    modules.map((m) => [m.name, m.built, m.requirements.map((r) => `${r.id}:${r.state}`)]),
    [
      ["auth", 1, ["REQ-010:proven", "REQ-012:building"]],
      ["pedidos", 0, ["REQ-031:waiting", "REQ-032:draft"]],
    ],
  );
});
