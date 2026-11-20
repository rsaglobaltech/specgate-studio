/**
 * specgate-1-4-gate REQ-224 … REQ-226, the core's part: what `validate
 * --strict --json` answers under a gate policy (specgate 1.4.2), grouped into
 * what fails and what the policy only reports, a policy specgate cannot read,
 * and the policy in force as `check` prints it. Pure.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { gateResultOf, policyLine, type Finding } from "../src/index.js";

const uncovered = (scn: string): Finding => ({
  severity: "warning",
  code: "scenario_untested",
  message: `${scn} is named by no test.`,
  fix: `Name ${scn} in a test.`,
  file: "features/pedidos/REQ-030.feature",
});
/** As specgate 1.4.2 writes it: after the rule's findings, turned into warnings. */
const reported = (rule: string, n: number): Finding => ({
  severity: "warning",
  code: "gate_rule_reported",
  message: `${n} ${rule} finding(s) reported, not failed: .specgate/gate.yaml sets ${rule} to warning.`,
  target: rule,
  fix: `Fix them, or set \`${rule}: error\` in .specgate/gate.yaml once they are.`,
});
const missingPath: Finding = {
  severity: "error",
  code: "link_missing",
  message: "docs/specs/traceability.md declares src/pedidos/cancel.ts, which does not exist.",
  fix: "Write the file, or correct the path in the matrix.",
};

test("REQ-224 SCN-996: two untested scenarios under coverage: warning — the gate passed, both reported under coverage with the reason and the fix", () => {
  const r = gateResultOf({
    data: { validation: { passed: true } },
    findings: [uncovered("SCN-101"), uncovered("SCN-102"), reported("coverage", 2)],
  });
  assert.equal(r.passed, true);
  assert.deepEqual(r.failing, []);
  assert.equal(r.reported.length, 1);
  const [cov] = r.reported;
  assert.equal(cov!.rule, "coverage");
  assert.equal(cov!.reason, ".specgate/gate.yaml sets coverage to warning");
  assert.match(cov!.fix ?? "", /set `coverage: error` in \.specgate\/gate\.yaml once they are/);
  assert.deepEqual(
    cov!.findings.map((f) => f.message),
    ["SCN-101 is named by no test.", "SCN-102 is named by no test."],
  );
});

test("REQ-224 SCN-997: a missing path fails and an untested scenario is reported — each in its own group", () => {
  const r = gateResultOf({
    data: { validation: { passed: false } },
    findings: [missingPath, uncovered("SCN-101"), reported("coverage", 1)],
  });
  assert.equal(r.passed, false);
  assert.deepEqual(r.failing, [missingPath]);
  assert.deepEqual(r.reported[0]!.findings, [uncovered("SCN-101")]);
});

test("REQ-224: a warning no rule reports stays among the others; the reported ones are told apart in the flat list", () => {
  const other: Finding = {
    severity: "warning",
    code: "tests_not_configured",
    message: "No test command.",
  };
  const r = gateResultOf({
    data: { validation: { passed: true } },
    findings: [other, uncovered("SCN-101"), reported("coverage", 1)],
  });
  assert.deepEqual(r.failing, [other]);
  const flat = r.problems();
  assert.deepEqual(
    flat.map((f) => [f.code, f.source, f.reported?.rule ?? null]),
    [
      ["tests_not_configured", "gate", null],
      ["scenario_untested", "gate", "coverage"],
    ],
  );
});

test("REQ-225 SCN-998: preset: lax — gate_policy_invalid, every problem and its fix, pointing at .specgate/gate.yaml", () => {
  const invalid: Finding = {
    severity: "error",
    code: "gate_policy_invalid",
    message:
      ".specgate/gate.yaml cannot be read: preset `lax` is not one of minimal, standard, strict.",
    fix: "Use preset: minimal, standard or strict.",
  };
  const r = gateResultOf({ data: { validation: null }, findings: [invalid] });
  assert.equal(r.passed, false);
  assert.equal(r.invalid?.code, "gate_policy_invalid");
  assert.equal(r.invalid?.file, ".specgate/gate.yaml");
  assert.match(r.invalid!.message, /preset `lax` is not one of minimal, standard, strict/);
  assert.equal(r.invalid?.fix, "Use preset: minimal, standard or strict.");
  assert.deepEqual(r.failing, [r.invalid]);
});

test("REQ-226 SCN-1000: standard with coverage warning — `standard · coverage warning`, as check prints it", () => {
  assert.equal(
    policyLine(
      { "gate.preset": "standard", "gate.rules.coverage": "warning", "gate.rules.tdd": "error" },
      "2026-11-20",
    ),
    "standard · coverage warning",
  );
  assert.equal(
    policyLine(
      { "gate.preset": "minimal", "gate.rules.ids": "off", "gate.rules.links": "warning" },
      "2026-11-20",
    ),
    "minimal · links warning · ids off",
  );
});

test("REQ-226: a date ahead says errors are reported until then; a date passed says nothing more", () => {
  assert.equal(
    policyLine({ "gate.preset": "strict", "gate.enforce_from": "2026-12-31" }, "2026-11-20"),
    "strict · errors reported as warnings until 2026-12-31",
  );
  assert.equal(
    policyLine({ "gate.preset": "strict", "gate.enforce_from": "2026-11-01" }, "2026-11-20"),
    "strict",
  );
});

test("REQ-226 SCN-1001: no policy file — no line", () => {
  assert.equal(policyLine({ test_cmd: "npm test" }, "2026-11-20"), null);
  assert.equal(policyLine(null, "2026-11-20"), null);
});
