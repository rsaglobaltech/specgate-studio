import type { Section, SectionData } from "../domain/section.js";
import type { SpecgateAnswer, SpecgatePort } from "../ports/SpecgatePort.js";

/**
 * A SpecgatePort in memory, loaded with answers a real adapter gave (REQ-015):
 * the use cases' tests run in milliseconds against it, and the contract keeps
 * it honest.
 */
export class InMemorySpecgate implements SpecgatePort {
  constructor(
    private readonly answers: {
      version: string;
      sections: Partial<Record<Section, SectionData>>;
      /** By the command's arguments joined with spaces: `apply REQ-001`. */
      calls?: Record<string, SpecgateAnswer>;
    },
  ) {}

  async version(): Promise<string> {
    return this.answers.version;
  }

  async read(section: Section): Promise<SectionData> {
    if (!(section in this.answers.sections)) throw new Error(`no answer recorded for ${section}`);
    return structuredClone(this.answers.sections[section]);
  }

  async call(args: readonly string[]): Promise<SpecgateAnswer> {
    const answer = this.answers.calls?.[args.join(" ")];
    if (!answer) throw new Error(`no answer recorded for specgate ${args.join(" ")}`);
    return structuredClone(answer);
  }
}
