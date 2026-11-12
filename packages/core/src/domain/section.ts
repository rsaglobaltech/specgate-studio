/**
 * The parts of a project's state the UI asks for, one per view. Each is read
 * from specgate once and kept in memory (REQ-002).
 */
export const SECTIONS = ["home", "changes", "questions", "matrix", "report"] as const;

export type Section = (typeof SECTIONS)[number];

/** What specgate answered for a section: opaque to the core, typed by the protocol. */
export type SectionData = unknown;

/**
 * Why a section could not be read, as the UI says it (draft-design-conformance
 * REQ-178, A18): the message, and the file and line it names when it names
 * them — "docs/specs/traceability.md:48", "traceability.md line 48".
 */
export interface Unreadable {
  message: string;
  file?: string;
  line?: number;
}

export function unreadableOf(error: unknown): Unreadable {
  const message = error instanceof Error ? error.message : String(error);
  const findings = (error as { findings?: unknown } | null)?.findings;
  if (Array.isArray(findings)) {
    for (const f of findings as Array<{ file?: unknown; line?: unknown; message?: unknown }>) {
      if (typeof f.file === "string")
        return {
          message: typeof f.message === "string" ? f.message : message,
          file: f.file,
          ...(typeof f.line === "number" ? { line: f.line } : {}),
        };
    }
  }
  const m = /([\w./-]+\.(?:md|ya?ml|feature|json))(?::(\d+)|,?\s+(?:at\s+)?line\s+(\d+))?/.exec(
    message,
  );
  if (!m) return { message };
  const line = Number(m[2] ?? m[3]);
  return { message, file: m[1]!, ...(Number.isFinite(line) && line > 0 ? { line } : {}) };
}
