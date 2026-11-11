import { SECTIONS, type Section } from "./section.js";

/**
 * The sections a file of the specification feeds (REQ-003, assumption A4):
 * when that file changes, only these are read again. A file outside the
 * specification — code, a README — feeds none. Paths are relative to the
 * project; Windows separators are read as `/`.
 */
export function sectionsFedBy(file: string): Section[] {
  const p = file.replace(/\\/g, "/").replace(/^\.\//, "");
  const fed = new Set<Section>(rule(p));
  return SECTIONS.filter((s) => fed.has(s));
}

function rule(p: string): Section[] {
  // The system lost which file changed (the watcher's ANY_FILE): read all again.
  if (p === "*") return [...SECTIONS];
  if (/^features\/.+\.feature$/.test(p)) return ["matrix"];
  if (p === "docs/brief.md") return ["home"];
  // The project's own questions: the agent's about a requirement of spec.md (draft-build-live REQ-104).
  if (p === "docs/specs/questions.md") return ["questions", "matrix"];
  if (p === "spec.md" || p === "docs/specs/traceability.md") return ["home", "matrix", "report"];
  if (/^docs\/specs\/capabilities\/[^/]+\/spec\.md$/.test(p)) return ["home", "matrix", "report"];
  const change = /^docs\/specs\/changes\/[^/]+\/(.+)$/.exec(p)?.[1];
  if (change === undefined) return [];
  if (change === "questions.md") return ["questions", "matrix"];
  if (/^specs\/.+\/spec\.md$/.test(change)) return ["home", "changes", "matrix"];
  return ["changes"];
}
