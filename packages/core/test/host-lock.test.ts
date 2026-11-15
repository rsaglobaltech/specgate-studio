/**
 * draft-desktop — which running core host a window or `serve` joins
 * (REQ-152, REQ-158): one host per project, found by its lock.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { hostToJoin, projectKey, type HostLock } from "../src/index.js";

const sprich: HostLock = {
  projectDir: "/Users/dev/mvp/sprich-platform/sprich",
  key: projectKey("/Users/dev/mvp/sprich-platform/sprich", true),
  url: "http://127.0.0.1:52011/",
  pid: 4242,
};

test("REQ-152 SCN-454: every spelling of sprich's folder is one project — the same key, so its one host is found again", () => {
  const key = projectKey("/Users/dev/mvp/sprich-platform/sprich", true);
  assert.equal(projectKey("/Users/dev/mvp/sprich-platform/sprich/", true), key);
  assert.equal(projectKey("/users/dev/MVP/sprich-platform/sprich", true), key);
  assert.equal(projectKey("C:\\Users\\dev\\sprich", true), "c:/users/dev/sprich");
  // Where case counts (Linux), two spellings are two folders.
  assert.notEqual(projectKey("/home/dev/Sprich", false), projectKey("/home/dev/sprich", false));
});

test("REQ-152 SCN-453: another project's host is never joined — specgate-studio gets its own", () => {
  const studio = projectKey("/Users/dev/mvp/specgate-studio", true);
  assert.equal(hostToJoin(sprich, studio, { alive: true, answers: true }), null);
});

test("REQ-158 SCN-464: serve for sprich joins the host the desktop app runs for it, while that host lives and answers", () => {
  assert.deepEqual(hostToJoin(sprich, sprich.key, { alive: true, answers: true }), sprich);
  // A crashed host's lock, or one whose port no longer answers, starts a new host.
  assert.equal(hostToJoin(sprich, sprich.key, { alive: false, answers: false }), null);
  assert.equal(hostToJoin(sprich, sprich.key, { alive: true, answers: false }), null);
  assert.equal(hostToJoin(null, sprich.key, { alive: true, answers: true }), null);
});
