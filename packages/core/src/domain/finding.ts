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
}
