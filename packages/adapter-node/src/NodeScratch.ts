import { mkdtemp, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { ScratchPort } from "@specgate-studio/core";

/**
 * ScratchPort in the system's temporary folder (draft-brief REQ-071,
 * REQ-074): each file in a folder of its own, outside every project, removed
 * with it — on any platform.
 */
export class NodeScratch implements ScratchPort {
  async write(name: string, text: string): Promise<string> {
    const dir = await mkdtemp(path.join(os.tmpdir(), "specgate-studio-"));
    const file = path.join(dir, path.basename(name));
    await writeFile(file, text, "utf8");
    return file;
  }

  async remove(file: string): Promise<void> {
    const dir = path.dirname(file);
    if (path.basename(dir).startsWith("specgate-studio-"))
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}
