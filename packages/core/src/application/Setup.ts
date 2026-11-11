import {
  ADOPTION_AREAS,
  ADOPT_FILES,
  CI_GATE,
  DETECTED_AGENTS,
  HARNESS_CONFIG,
  adoptPreview,
  adoptionAreas,
  hasTests,
  readiness,
  type AdoptPreview,
  type Area,
  type ReadyItem,
} from "../domain/setup.js";
import type { FileSystemPort } from "../ports/FileSystemPort.js";
import type { SetupPort } from "../ports/SetupPort.js";

export interface SetupOptions {
  /** The open folder, absolute with `/`. */
  root: string;
  port: SetupPort;
  fs: FileSystemPort;
  /** The folder's files, relative with `/`, ignored folders left out. */
  files: () => Promise<string[]>;
  /** Whether a program is on the PATH. */
  onPath: (program: string) => boolean;
}

/**
 * The setup of the open folder (draft-project-setup): the adoption's preview
 * (REQ-112, REQ-113), what is ready (REQ-114) and the areas adoption found
 * (REQ-115) — from specgate's JSON and the folder, never its prose.
 */
export class Setup {
  constructor(private readonly o: SetupOptions) {}

  async preview(): Promise<AdoptPreview> {
    const { root, fs, port } = this.o;
    const candidates = [...ADOPT_FILES, ADOPTION_AREAS, CI_GATE, HARNESS_CONFIG];
    const [onboard, config, files, pkg, present] = await Promise.all([
      port.onboard(),
      port.config().catch(() => ({})),
      this.o.files(),
      fs.readText(`${root}/package.json`),
      Promise.all(candidates.map((f) => fs.exists(`${root}/${f}`))),
    ]);
    return adoptPreview({
      present: new Set(candidates.filter((_, i) => present[i])),
      areas: onboard.areas,
      testCommand: onboard.testCommand,
      hasTests: hasTests(pkg, files),
      found: DETECTED_AGENTS.filter((a) => this.o.onPath(a)),
      config,
    });
  }

  async readiness(): Promise<ReadyItem[]> {
    const [config, ci] = await Promise.all([this.o.port.config(), this.o.port.ciFile()]);
    return readiness(config, ci);
  }

  async areas(): Promise<{ adopted: boolean; byKind: boolean; areas: Area[] }> {
    const [onboard, md] = await Promise.all([
      this.o.port.onboard(),
      this.o.fs.readText(`${this.o.root}/${ADOPTION_AREAS}`),
    ]);
    return { adopted: onboard.adopted, byKind: onboard.byKind, areas: adoptionAreas(md ?? "") };
  }
}
