import { SECTIONS, type Section, type SectionData } from "../domain/section.js";
import type { SectionReader } from "../ports/SectionReader.js";

/**
 * The open project's state, held by the core host (REQ-002): every section is
 * read once and answered from memory afterwards, so a view switch or a browser
 * reload never runs specgate again. A request made while a section is being
 * read waits for that same read.
 */
export class ProjectState {
  private readonly held = new Map<Section, Promise<SectionData>>();

  constructor(private readonly specgate: SectionReader) {}

  /** The first read: every section, at once. */
  async open(): Promise<void> {
    await Promise.all(SECTIONS.map((section) => this.section(section)));
  }

  /** A section's data, from memory once it has been read. */
  section(section: Section): Promise<SectionData> {
    let held = this.held.get(section);
    if (!held) {
      held = this.specgate.read(section);
      this.held.set(section, held);
      // A failed read is not kept: the next request reads again.
      held.catch(() => {
        if (this.held.get(section) === held) this.held.delete(section);
      });
    }
    return held;
  }
}
