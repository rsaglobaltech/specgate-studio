/**
 * What specgate says about a command, in its own words: every `--json` output
 * carries them under `status` (ADR-0003). The studio shows the message and the
 * fix; it never parses specgate's prose.
 */
export interface Finding {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  /** What it is about: a requirement, a change, a file. */
  target?: string;
  /** What to do about it, when specgate says. */
  fix?: string;
  /** Where it is, relative to the project, when specgate says (draft-editor REQ-043). */
  file?: string;
  line?: number;
  /** Which check found it, when Problems lists more than one (specgate-1-4-gate REQ-224). */
  source?: "brief" | "gate";
  /** A finding the gate's policy reports without failing: its rule, specgate's reason and fix (REQ-224). */
  reported?: { rule: string; reason: string; fix?: string };
}
