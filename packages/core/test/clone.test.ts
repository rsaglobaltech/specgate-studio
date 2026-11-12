/**
 * draft-workbench-v2 REQ-185 in the core: Clone Repository's command — `gh
 * repo clone` when the GitHub CLI is signed in, `git clone` otherwise —
 * always into the folder the Developer chose (A33), on every system.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { clonePlan } from "../src/index.js";

const posix = (a: string, b: string) => `${a.replace(/\/+$/, "")}/${b}`;
const win = (a: string, b: string) => `${a.replace(/\\+$/, "")}\\${b}`;

test("REQ-185 SCN-572: rsaglobaltech/sprich into ~/mvp with the GitHub CLI signed in — gh repo clone", () => {
  assert.deepEqual(clonePlan("rsaglobaltech/sprich", "/Users/ana/mvp", true, posix), {
    program: "gh",
    args: ["repo", "clone", "rsaglobaltech/sprich", "/Users/ana/mvp/sprich"],
    dest: "/Users/ana/mvp/sprich",
    name: "sprich",
    shown: "gh repo clone rsaglobaltech/sprich /Users/ana/mvp/sprich",
  });
});

test("REQ-185: without the GitHub CLI signed in — git clone of its https URL, on Windows too", () => {
  const plan = clonePlan("rsaglobaltech/sprich", "C:\\Users\\Ana\\mvp", false, win);
  assert.deepEqual(plan?.args, [
    "clone",
    "https://github.com/rsaglobaltech/sprich.git",
    "C:\\Users\\Ana\\mvp\\sprich",
  ]);
  assert.equal(plan?.program, "git");
});

test("REQ-185: a URL is cloned with git as given, its name without .git; gh takes it too", () => {
  const url = "https://gitlab.com/team/shop.git";
  assert.deepEqual(clonePlan(url, "/srv", false, posix)?.args, ["clone", url, "/srv/shop"]);
  assert.deepEqual(clonePlan("git@github.com:o/r.git", "/srv", false, posix)?.dest, "/srv/r");
  assert.equal(clonePlan(url, "/srv", true, posix)?.program, "gh");
});

test("REQ-185: what is no repository is refused — nothing to run", () => {
  for (const bad of ["", "sprich", "-o/evil", "a/b/c d", "--upload-pack=x", "o/..", "file:///etc"])
    assert.equal(clonePlan(bad, "/srv", true, posix), null, bad);
});
