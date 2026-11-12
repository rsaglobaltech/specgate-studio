/**
 * draft-workbench-v2 REQ-187 without a browser: each folder and file's kind
 * and its accent colour from the design tokens (A12, A31), a generic icon
 * for a kind the theme does not know, every icon drawn as the activity
 * bar's (A13).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { ICON_GLYPHS, iconOf } from "../src/fileIcons.js";

test("REQ-187 SCN-554: the folders of A12, each its kind and colour; open and closed", () => {
  const cases: Array<[string, string, string]> = [
    ["docs", "folder-docs", "--blue"],
    ["src", "folder-src", "--accent-soft"],
    ["test", "folder-test", "--ok"],
    ["tests", "folder-test", "--ok"],
    ["features", "folder-features", "--accent"],
    ["specs", "folder-specs", "--accent"],
    [".github", "folder-github", "--row-text"],
    ["node_modules", "folder-node_modules", "--muted"],
    ["scripts", "folder-scripts", "--row-text"],
    ["dist", "folder-dist", "--muted"],
    ["build", "folder-dist", "--muted"],
    ["out", "folder-dist", "--muted"],
    ["bin", "folder-bin", "--muted"],
    [".claude", "folder-claude", "--muted"],
    [".idea", "folder-idea", "--muted"],
    [".vscode", "folder-vscode", "--muted"],
    ["public", "folder-public", "--row-text"],
    ["assets", "folder-assets", "--row-text"],
    ["components", "folder-components", "--accent-soft"],
    ["lib", "folder-lib", "--accent-soft"],
    ["packages", "folder-packages", "--accent-soft"],
    ["apps", "folder-apps", "--accent-soft"],
    ["config", "folder-config", "--amber"],
  ];
  for (const [name, kind, token] of cases)
    assert.deepEqual([iconOf(name, true).kind, iconOf(name, true).token], [kind, token], name);
  assert.equal(iconOf("Docs", true).kind, "folder-docs", "without case");
  assert.notDeepEqual(iconOf("docs", true, true).paths, iconOf("docs", true, false).paths);
});

test("REQ-187 SCN-554: the files of A12, each its kind and colour", () => {
  const cases: Array<[string, string, string]> = [
    [".gitignore", "gitignore", "--row-text"],
    ["LICENSE", "license", "--row-text"],
    ["LICENSE.md", "license", "--row-text"],
    ["package.json", "package", "--amber"],
    ["package-lock.json", "lock", "--amber"],
    ["CHANGELOG.md", "changelog", "--blue"],
    ["README.md", "readme", "--blue"],
    ["AGENTS.md", "agents", "--accent"],
    ["CLAUDE.md", "agents", "--accent"],
    ["spec.md", "spec", "--accent"],
    ["notes.md", "markdown", "--blue"],
    ["cart.ts", "typescript", "--accent-soft"],
    ["App.tsx", "typescript", "--accent-soft"],
    ["vite.config.js", "javascript", "--accent-soft"],
    ["data.json", "json", "--amber"],
    ["ci.yml", "yaml", "--amber"],
    ["docker-compose.yaml", "yaml", "--amber"],
    ["eslint.config.mjs", "eslint", "--amber"],
    [".eslintrc.json", "eslint", "--amber"],
    [".prettierrc", "prettier", "--amber"],
    ["prettier.config.cjs", "prettier", "--amber"],
    ["tsconfig.json", "tsconfig", "--amber"],
    ["tsconfig.base.json", "tsconfig", "--amber"],
    ["Dockerfile", "docker", "--row-text"],
    ["REQ-031.feature", "feature", "--accent"],
    ["Main.java", "java", "--accent-soft"],
    ["app.py", "python", "--accent-soft"],
    ["styles.css", "css", "--accent-soft"],
    ["index.html", "html", "--accent-soft"],
    ["logo.png", "image", "--row-text"],
    ["logo.svg", "image", "--row-text"],
  ];
  for (const [name, kind, token] of cases)
    assert.deepEqual([iconOf(name, false).kind, iconOf(name, false).token], [kind, token], name);
});

test("REQ-187 SCN-555: a kind it does not know — the generic folder or file icon, muted", () => {
  assert.deepEqual(
    [iconOf("notes.xyz", false).kind, iconOf("notes.xyz", false).token],
    ["file", "--muted"],
  );
  assert.deepEqual([iconOf("misc", true).kind, iconOf("misc", true).token], ["folder", "--muted"]);
});

test("REQ-187: every glyph is stroke paths on the 24 px grid, nothing fetched", () => {
  for (const [kind, paths] of Object.entries(ICON_GLYPHS)) {
    assert.ok(paths.length > 0, kind);
    for (const d of paths) assert.match(d, /^[MmLlHhVvCcSsQqTtAaZz0-9 .,-]+$/, kind);
  }
});
