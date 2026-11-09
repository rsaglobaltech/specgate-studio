/**
 * Which sections a file of the specification feeds (REQ-003, assumption A4).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { sectionsFedBy } from "../src/index.js";

test("REQ-003: each file of the specification feeds its sections, in the order of the views", () => {
  const cases: Array<[string, string[]]> = [
    ["docs/specs/changes/draft-pedidos/questions.md", ["questions", "matrix"]],
    ["features/auth/REQ-010.feature", ["matrix"]],
    ["docs/specs/changes/draft-pedidos/specs/pedidos/spec.md", ["home", "changes", "matrix"]],
    ["docs/specs/changes/draft-pedidos/proposal.md", ["changes"]],
    ["docs/specs/changes/draft-pedidos/review.md", ["changes"]],
    ["docs/specs/traceability.md", ["home", "matrix", "report"]],
    ["spec.md", ["home", "matrix", "report"]],
    ["docs/specs/capabilities/orders/spec.md", ["home", "matrix", "report"]],
    ["docs/brief.md", ["home"]],
    ["src/orders.ts", []],
    ["README.md", []],
  ];
  for (const [file, sections] of cases) assert.deepEqual(sectionsFedBy(file), sections, file);
});
