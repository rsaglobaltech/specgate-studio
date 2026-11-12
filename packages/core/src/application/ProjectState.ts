import { SECTIONS, type Section, type SectionData } from "../domain/section.js";
import { sectionsFedBy } from "../domain/fedBy.js";
import type { SectionReader } from "../ports/SectionReader.js";

export type ChangeListener = (sections: Section[]) => void;

/**
 * The open project's state, held by the core host.
 *
 * Every section is read once and answered from memory afterwards, so a view
 * switch or a browser reload never runs specgate again (REQ-002). A request
 * made while a section is being read waits for that same read. When a file of
 * the specification changes, only the sections it feeds are read again, and
 * the listeners are told which (REQ-003).
 */
export class ProjectState {
  private readonly held = new Map<Section, Promise<SectionData>>();
  private readonly listeners = new Set<ChangeListener>();

  constructor(private readonly specgate: SectionReader) {}

  /** The first read: every section, at once. */
  /**
   * Every section read once. A section that cannot be read does not keep the
   * others from opening (draft-design-conformance REQ-178): only when none
   * can be read is the project not opened — a folder that is no project.
   */
  async open(): Promise<void> {
    const read = await Promise.allSettled(SECTIONS.map((section) => this.section(section)));
    const failed = read.find((r): r is PromiseRejectedResult => r.status === "rejected");
    if (failed && read.every((r) => r.status === "rejected")) throw failed.reason;
  }

  /** A section's data, from memory once it has been read. */
  section(section: Section): Promise<SectionData> {
    return this.held.get(section) ?? this.read(section);
  }

  /** A file changed: read again what it feeds, and say which sections changed. */
  async fileChanged(file: string): Promise<Section[]> {
    const fed = sectionsFedBy(file);
    if (fed.length === 0) return fed;
    await Promise.all(fed.map((section) => this.read(section)));
    for (const listener of this.listeners) listener(fed);
    return fed;
  }

  /** Be told when sections change; returns the way to stop. */
  onChange(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private read(section: Section): Promise<SectionData> {
    const reading = this.specgate.read(section);
    this.held.set(section, reading);
    // A failed read is not kept: the next request reads again.
    reading.catch(() => {
      if (this.held.get(section) === reading) this.held.delete(section);
    });
    return reading;
  }
}
