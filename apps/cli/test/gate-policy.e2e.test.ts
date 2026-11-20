/**
 * specgate-1-4-gate REQ-224 … REQ-226 in a real browser: Check from Home,
 * then Problems — what fails apart from what the gate's policy only reports —
 * a policy specgate cannot read, and the policy in force on Home. specgate's
 * answers are those 1.4.2 gives (`validate --strict --json`, `config list --json`).
 */
import test from "node:test";
import assert from "node:assert/strict";
import type { Finding, SpecgateAnswer } from "@specgate-studio/core";
import { close, open, showPanel, studio, type Page } from "./support.js";

const POLICY = ".specgate/gate.yaml";
const uncovered = (scn: string): Finding => ({
  severity: "warning",
  code: "scenario_untested",
  message: `${scn} is named by no test.`,
  fix: `Name ${scn} in a test.`,
});
const reported = (rule: string, n: number): Finding => ({
  severity: "warning",
  code: "gate_rule_reported",
  message: `${n} ${rule} finding(s) reported, not failed: ${POLICY} sets ${rule} to warning.`,
  target: rule,
  fix: `Fix them, or set \`${rule}: error\` in ${POLICY} once they are.`,
});
const validate = (passed: boolean | null, findings: Finding[]): SpecgateAnswer => ({
  data: { validation: passed === null ? null : { passed } },
  findings,
  exitCode: passed ? 0 : 1,
});
const configList = (config: Record<string, unknown>): SpecgateAnswer => ({
  data: { config, files: Object.fromEntries(Object.keys(config).map((k) => [k, POLICY])) },
  findings: [],
  exitCode: 0,
});
const STANDARD = { "gate.preset": "standard", "gate.rules.coverage": "warning" };

async function check(page: Page, pill: "Gate green" | "Gate red") {
  await page.click('.actions [data-act="check"]');
  await page.waitForFunction(
    (text) => document.querySelector('[data-testid="gate-pill"]')?.textContent === text,
    pill,
  );
}
async function problems(page: Page) {
  await showPanel(page);
  await page.click('.ptab:has-text("Problems")');
}

test("REQ-224 SCN-996: two untested scenarios under coverage: warning, on the desktop — the gate passed, both under Reported, not failed with coverage, its reason and fix", async () => {
  const s = await studio({
    specgate: {
      "validate --strict": validate(true, [
        uncovered("SCN-101"),
        uncovered("SCN-102"),
        reported("coverage", 2),
      ]),
      "config list": configList(STANDARD),
    },
  });
  const page = await open(s);
  try {
    await check(page, "Gate green");
    await problems(page);
    const group = '[data-panel="problems"] [data-group="reported"][data-rule="coverage"]';
    await page.waitForSelector(group);
    assert.match((await page.textContent(`${group} h3`)) ?? "", /Reported, not failed · coverage/);
    const reason = (await page.textContent(`${group} [data-reason]`)) ?? "";
    assert.match(reason, /\.specgate\/gate\.yaml sets coverage to warning/);
    assert.match(reason, /set `coverage: error` in \.specgate\/gate\.yaml once they are/);
    assert.equal(await page.locator(`${group} li`).count(), 2);
    assert.equal(await page.locator('[data-panel="problems"] [data-group="gate"]').count(), 0);
  } finally {
    await close(s, page);
  }
});

test("REQ-224 SCN-997: one failure and one reported finding, in the browser — the gate failed; the missing path among the failures, the untested scenario reported under coverage", async () => {
  const missing: Finding = {
    severity: "error",
    code: "link_missing",
    message: "docs/specs/traceability.md declares src/pedidos/cancel.ts, which does not exist.",
    fix: "Write the file, or correct the path in the matrix.",
  };
  const s = await studio({
    checkExit: 1,
    specgate: {
      "validate --strict": validate(false, [
        missing,
        uncovered("SCN-101"),
        reported("coverage", 1),
      ]),
      "config list": configList(STANDARD),
    },
  });
  const page = await open(s);
  try {
    await check(page, "Gate red");
    await problems(page);
    const failing = '[data-panel="problems"] [data-group="gate"]';
    await page.waitForSelector(`${failing} [data-code="link_missing"]`);
    assert.equal(await page.locator(`${failing} li`).count(), 1);
    const cov = '[data-panel="problems"] [data-group="reported"][data-rule="coverage"]';
    assert.equal(await page.locator(`${cov} [data-code="scenario_untested"]`).count(), 1);
  } finally {
    await close(s, page);
  }
});

test("REQ-225 SCN-998 SCN-999: preset: lax — Home and Problems say .specgate/gate.yaml cannot be read, each problem and its fix; the file opens in the editor", async () => {
  const invalid: Finding = {
    severity: "error",
    code: "gate_policy_invalid",
    message: `${POLICY} cannot be read: preset \`lax\` is not one of minimal, standard, strict.`,
    fix: "Use preset: minimal, standard or strict.",
  };
  const s = await studio({
    checkExit: 1,
    files: { [POLICY]: "preset: lax\n", "spec.md": "# spec.md\n" },
    specgate: {
      "validate --strict": validate(null, [invalid]),
      "config list": { data: { config: null }, findings: [invalid], exitCode: 1 },
    },
  });
  const page = await open(s);
  try {
    await check(page, "Gate red");
    const alert = '.gate-invalid[data-code="gate_policy_invalid"]';
    await page.waitForSelector(alert);
    const said = (await page.textContent(alert)) ?? "";
    assert.match(said, /\.specgate\/gate\.yaml cannot be read/);
    assert.match(said, /preset `lax` is not one of minimal, standard, strict/);
    assert.match(said, /Use preset: minimal, standard or strict/);
    await problems(page);
    const row = '[data-panel="problems"] [data-group="gate"] [data-code="gate_policy_invalid"]';
    await page.waitForSelector(row);
    // SCN-999: the finding's file opens in the editor.
    await page.click(`${row} .loc`);
    await page.waitForSelector(`.tab[aria-selected="true"][title="${POLICY}"]`);
  } finally {
    await close(s, page);
  }
});

test("REQ-226 SCN-1000: standard with coverage reported, on the desktop — Home says Policy: standard · coverage warning", async () => {
  const s = await studio({ specgate: { "config list": configList(STANDARD) } });
  const page = await open(s);
  try {
    await page.waitForSelector(".actions [data-policy]");
    assert.equal(
      await page.textContent(".actions [data-policy]"),
      "Policy: standard · coverage warning",
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-226 SCN-1001: no policy file, in the browser — Home shows the gate with no policy line", async () => {
  const s = await studio({ specgate: { "config list": configList({ test_cmd: "npm test" }) } });
  const page = await open(s);
  try {
    await page.waitForSelector('.actions [data-act="check"]');
    await check(page, "Gate green");
    assert.equal(await page.locator("[data-policy]").count(), 0);
    assert.equal(await page.locator(".gate-invalid").count(), 0);
  } finally {
    await close(s, page);
  }
});
