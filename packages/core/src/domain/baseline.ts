/**
 * The adoption baseline (specgate-1-4-setup REQ-230): the requirement
 * adoption writes for the code already there — tagged in
 * `features/adoption/baseline.feature` and titled "Preserve existing
 * behaviour", REQ-001 since specgate 1.4, REQ-000 before. It is closed by a
 * test that names it, not built: Home does not count it while it is pending,
 * and Build lists it only once named (REQ-101).
 */

/** The feature adoption tags its baseline in. */
export const BASELINE_FEATURE = "features/adoption/baseline.feature";

/** The baseline's title when adoption found code. */
export const BASELINE_TITLE = "Preserve existing behaviour";

/** The baseline a project adopted before specgate 1.4 has. */
export const BASELINE = "REQ-000";

type Row = Record<string, unknown>;

const rows = (v: unknown, key: string): Row[] => {
  const list = (v as Record<string, unknown> | null)?.[key];
  return Array.isArray(list) ? list.filter((r): r is Row => !!r && typeof r === "object") : [];
};
const text = (v: unknown): string => (typeof v === "string" ? v : "");
/** `report --json` writes the feature in backticks and the title after its use case. */
const plainFeature = (v: unknown) => text(v).replace(/`/g, "").trim();
const plainTitle = (v: unknown) =>
  text(v)
    .replace(/^UC-\d+\s+/, "")
    .trim();

/**
 * The baseline's id, from `status --json` and `report --json`; null when the
 * project has none — one adopted with no code, whose REQ-001 "Build and test
 * the project" counts as any other requirement.
 */
export function baselineOf(status: unknown, report: unknown): string | null {
  const titles = new Map(rows(status, "requirements").map((r) => [text(r.id), text(r.title)]));
  for (const r of rows(report, "requirements")) {
    const id = text(r.requirement);
    if (!id || plainFeature(r.featureFile) !== BASELINE_FEATURE) continue;
    if (plainTitle(r.title) === BASELINE_TITLE || titles.get(id) === BASELINE_TITLE) return id;
  }
  return titles.has(BASELINE) ? BASELINE : null;
}

/** The baseline while it is pending: what Home leaves out of its counters. */
export function pendingBaseline(status: unknown, report: unknown): string | null {
  const id = baselineOf(status, report);
  if (!id) return null;
  const row = rows(status, "requirements").find((r) => r.id === id);
  return row && row.category !== "DONE" ? id : null;
}
