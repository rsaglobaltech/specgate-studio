import type { Finding } from "./finding.js";

/**
 * The gate under its policy (specgate 1.4, `.specgate/gate.yaml`;
 * specgate-1-4-gate REQ-224 … REQ-226): what `validate --strict --json`
 * answered, grouped into what fails and what the policy only reports, a
 * policy specgate cannot read, and the policy in force as `check` prints it.
 * Pure.
 */

/** The file specgate reads the policy from. */
export const GATE_POLICY_FILE = ".specgate/gate.yaml";

/** The gate's rules, in the order specgate lists them. */
export const GATE_RULES = [
  "tdd",
  "scenarios",
  "requirements",
  "links",
  "coverage",
  "ids",
  "quality",
] as const;

/** One rule the policy sets to warning, and its findings, reported, not failed (REQ-224). */
export interface ReportedRule {
  rule: string;
  /** specgate's reason: `.specgate/gate.yaml sets coverage to warning`. */
  reason: string;
  fix?: string;
  findings: Finding[];
}

export interface GateResult {
  /** `validation.passed`; false when specgate could not validate at all (a policy it cannot read). */
  passed: boolean;
  /** Everything not reported by a rule: what fails, and the warnings no rule speaks for. */
  failing: Finding[];
  reported: ReportedRule[];
  /** `gate_policy_invalid`, pointing at the policy's file (REQ-225). */
  invalid: Finding | null;
  /** One list for Problems: the failing first, then each reported rule's findings, each marked. */
  problems(): Finding[];
}

const REPORTED_PREFIX = /^\d+\s+\S+\s+finding\(s\)\s+reported,\s+not failed:\s*/;

/**
 * Groups `validate --strict --json`'s findings. specgate 1.4 writes a rule's
 * findings as warnings, then one `gate_rule_reported` whose target is the rule
 * and whose message starts with how many there were: those are taken back
 * from the warnings just before it.
 */
export function gateResultOf(answer: { data: unknown; findings: readonly Finding[] }): GateResult {
  const validation = (answer.data as { validation?: { passed?: unknown } | null } | null)
    ?.validation;
  const listed: Finding[] = [];
  const reported: ReportedRule[] = [];
  let invalid: Finding | null = null;
  for (const f of answer.findings) {
    if (f.code === "gate_rule_reported" && f.target) {
      const n = Number(/^(\d+)/.exec(f.message)?.[1] ?? 0);
      const taken: Finding[] = [];
      for (let i = listed.length - 1; i >= 0 && taken.length < n; i--)
        if (listed[i]!.severity === "warning") taken.unshift(...listed.splice(i, 1));
      reported.push({
        rule: f.target,
        reason: f.message.replace(REPORTED_PREFIX, "").replace(/\.$/, ""),
        ...(f.fix ? { fix: f.fix } : {}),
        findings: taken,
      });
      continue;
    }
    if (f.code === "gate_policy_invalid") {
      invalid = { ...f, file: f.file ?? GATE_POLICY_FILE };
      listed.push(invalid);
      continue;
    }
    listed.push(f);
  }
  const passed = validation?.passed === true;
  return {
    passed,
    failing: listed,
    reported,
    invalid,
    problems: () => [
      ...listed.map((f) => ({ ...f, source: "gate" as const })),
      ...reported.flatMap((r) =>
        r.findings.map((f) => ({
          ...f,
          source: "gate" as const,
          reported: { rule: r.rule, reason: r.reason, ...(r.fix ? { fix: r.fix } : {}) },
        })),
      ),
    ],
  };
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

/**
 * The policy in force from `config list --json`'s values, as `check` prints
 * it: the preset, each rule not at error, and the date errors are enforced
 * from while it is ahead of `today` (YYYY-MM-DD). Null when no `gate.*` key is
 * set: no policy file, nothing to say (REQ-226).
 */
export function policyLine(
  config: Record<string, unknown> | null | undefined,
  today: string,
): string | null {
  if (!config || !Object.keys(config).some((k) => k.startsWith("gate."))) return null;
  const parts = [str(config["gate.preset"]) ?? "strict"];
  for (const rule of GATE_RULES) {
    const level = str(config[`gate.rules.${rule}`]);
    if (level && level !== "error") parts.push(`${rule} ${level}`);
  }
  const from = str(config["gate.enforce_from"]);
  if (from && from > today) parts.push(`errors reported as warnings until ${from}`);
  return parts.join(" · ");
}
