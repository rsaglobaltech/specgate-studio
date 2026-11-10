import { promises as fsp } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { StorePort } from "@specgate-studio/core";

/**
 * The studio's settings folder for this user account (draft-workspace A6):
 * `%APPDATA%\specgate-studio` on Windows, `~/Library/Application
 * Support/specgate-studio` on macOS, `$XDG_CONFIG_HOME/specgate-studio` or
 * `~/.config/specgate-studio` on Linux. `SPECGATE_STUDIO_HOME` overrides it.
 */
export function studioHome(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  home: string = os.homedir(),
): string {
  if (env.SPECGATE_STUDIO_HOME) return env.SPECGATE_STUDIO_HOME;
  if (platform === "win32") {
    return path.join(env.APPDATA || path.join(home, "AppData", "Roaming"), "specgate-studio");
  }
  if (platform === "darwin") {
    return path.join(home, "Library", "Application Support", "specgate-studio");
  }
  return path.join(env.XDG_CONFIG_HOME || path.join(home, ".config"), "specgate-studio");
}

/** StorePort as one JSON file per key in the studio's settings folder. */
export class NodeStore implements StorePort {
  constructor(private readonly dir: string = studioHome()) {}

  async read<T>(key: string): Promise<T | null> {
    try {
      return JSON.parse(await fsp.readFile(this.file(key), "utf8")) as T;
    } catch {
      return null;
    }
  }

  async write<T>(key: string, value: T): Promise<void> {
    await fsp.mkdir(this.dir, { recursive: true });
    // Written whole, then renamed: a crash never leaves half a file.
    const tmp = `${this.file(key)}.${process.pid}.tmp`;
    await fsp.writeFile(tmp, JSON.stringify(value, null, 2) + "\n", "utf8");
    await fsp.rename(tmp, this.file(key));
  }

  private file(key: string): string {
    if (!/^[a-z0-9-]+$/.test(key)) throw new Error(`not a store key: ${key}`);
    return path.join(this.dir, `${key}.json`);
  }
}
