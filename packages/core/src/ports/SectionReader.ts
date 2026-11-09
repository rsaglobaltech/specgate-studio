import type { Section, SectionData } from "../domain/section.js";

/**
 * Driven port: reads one section of the project from specgate. The CLI adapter
 * runs `specgate … --json`; the in-process adapter calls specgate's API
 * (ADR-0003). Both are slow compared with memory — that is why the core caches.
 */
export interface SectionReader {
  read(section: Section): Promise<SectionData>;
}
