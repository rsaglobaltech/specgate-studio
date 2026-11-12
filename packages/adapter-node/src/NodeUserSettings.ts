import { promises as fsp } from "node:fs";
import * as path from "node:path";
import type { UserSettingsPort } from "@specgate-studio/core";
import { studioHome } from "./NodeStore.js";

/**
 * UserSettingsPort as `settings.json` in the studio's settings folder of this
 * user account (draft-settings A2): the same file for the desktop app and
 * `specgate-studio serve`, never one of a project.
 */
export class NodeUserSettings implements UserSettingsPort {
  readonly file: string;

  constructor(dir: string = studioHome()) {
    this.file = path.join(dir, "settings.json");
  }

  async read(): Promise<Record<string, unknown>> {
    try {
      const values = JSON.parse(await fsp.readFile(this.file, "utf8")) as unknown;
      return values && typeof values === "object" && !Array.isArray(values)
        ? (values as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  async write(values: Record<string, unknown>): Promise<void> {
    await fsp.mkdir(path.dirname(this.file), { recursive: true });
    // Written whole, then renamed: a crash never leaves half a file.
    const tmp = `${this.file}.${process.pid}.tmp`;
    await fsp.writeFile(tmp, JSON.stringify(values, null, 2) + "\n", "utf8");
    await fsp.rename(tmp, this.file);
  }
}
