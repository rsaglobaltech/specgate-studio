/**
 * draft-live-polish in the core: REQ-000, the adoption baseline, is listed in
 * Build only once named (REQ-101, A10); harness.config.yaml feeds Build, so
 * the agent set by any hand shows without a reload (REQ-203, A14).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { BASELINE, buildList, sectionsFedBy } from "../src/index.js";
import { REPORT, SPRICH_STATUS } from "./sprich-build.js";

const status = {
  requirements: [
    { id: "REQ-000", title: "Health baseline", category: "NEEDS_EVERYTHING", needs: "its code" },
    ...SPRICH_STATUS.requirements,
  ],
};

test("REQ-101 SCN-608: REQ-000 is neither ready nor waiting in Build until it is named; named, it is ready", () => {
  assert.equal(BASELINE, "REQ-000");
  const unnamed = buildList(status, new Set(), REPORT, { agent: "claude" });
  assert.ok(!unnamed.ready.some((r) => r.id === "REQ-000"));
  assert.ok(!unnamed.waiting.some((r) => r.id === "REQ-000"));
  assert.deepEqual(
    unnamed.ready.map((r) => r.id),
    ["REQ-030", "REQ-032"],
  );
  const named = buildList(status, new Set(), REPORT, { agent: "claude" }, null, {}, "REQ-000");
  assert.deepEqual(
    named.ready.map((r) => r.id),
    ["REQ-000", "REQ-030", "REQ-032"],
  );
  // Naming another requirement does not name the baseline.
  const other = buildList(status, new Set(), REPORT, { agent: "claude" }, null, {}, "REQ-030");
  assert.ok(!other.ready.some((r) => r.id === "REQ-000"));
});

test("REQ-203 SCN-607: harness.config.yaml feeds home, whose change Build follows; other root files feed nothing", () => {
  assert.deepEqual(sectionsFedBy("harness.config.yaml"), ["home"]);
  assert.deepEqual(sectionsFedBy("./harness.config.yaml"), ["home"]);
  assert.deepEqual(sectionsFedBy("package.json"), []);
});
