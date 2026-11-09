/**
 * The parts of a project's state the UI asks for, one per view. Each is read
 * from specgate once and kept in memory (REQ-002).
 */
export const SECTIONS = ["home", "changes", "questions", "matrix", "report"] as const;

export type Section = (typeof SECTIONS)[number];

/** What specgate answered for a section: opaque to the core, typed by the protocol. */
export type SectionData = unknown;
