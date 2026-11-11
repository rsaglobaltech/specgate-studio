import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { HarnessEventsPort, HarnessEventsSnapshot } from "@specgate-studio/core";

/** Where specgate's harness writes its events (its ADR-0037), git-ignored. */
const EVENTS = path.join(".harness", "events");
const REQ_FILE = /^(REQ-\d+)\.jsonl$/;

/**
 * HarnessEventsPort over the files `specgate harness run` writes
 * (draft-build-live A9): `.harness/events/<REQ>.jsonl` and `queue.json`. A
 * file not written since `since` is not read; one unchanged since the last
 * read — same size, same time — is not read again.
 */
export class NodeHarnessEvents implements HarnessEventsPort {
  private readonly kept = new Map<string, { size: number; mtimeMs: number; text: string }>();

  async read(root: string, since: number): Promise<HarnessEventsSnapshot> {
    const dir = path.join(root, EVENTS);
    let names: string[];
    try {
      names = await fs.readdir(dir);
    } catch {
      return { files: {}, queue: null };
    }
    const files: Record<string, string> = {};
    await Promise.all(
      names.map(async (name) => {
        const req = REQ_FILE.exec(name)?.[1];
        if (!req) return;
        const file = path.join(dir, name);
        try {
          const st = await fs.stat(file);
          // Written before the run being shown: nothing of it counts.
          if (st.mtimeMs < (since - 1) * 1000) return;
          const was = this.kept.get(file);
          if (was && was.size === st.size && was.mtimeMs === st.mtimeMs) {
            files[req] = was.text;
            return;
          }
          const text = await fs.readFile(file, "utf8");
          this.kept.set(file, { size: st.size, mtimeMs: st.mtimeMs, text });
          files[req] = text;
        } catch {
          /* removed while it was read */
        }
      }),
    );
    const queue = await fs.readFile(path.join(dir, "queue.json"), "utf8").catch(() => null);
    return { files, queue };
  }
}
