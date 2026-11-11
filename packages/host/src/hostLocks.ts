import { createHash } from "node:crypto";
import { promises as fsp } from "node:fs";
import { request } from "node:http";
import * as path from "node:path";
import { hostToJoin, projectKey, type HostLock } from "@specgate-studio/core";
import { caseInsensitivePaths, studioHome } from "@specgate-studio/adapter-node";

/**
 * The locks of the running core hosts, one file per project under the
 * studio's settings folder (`hosts/<hash>.json`): how a desktop window and
 * `specgate-studio serve` on the same project find each other's host and
 * share it (draft-desktop REQ-152, REQ-158, A11). Which lock is joined is
 * core's rule (`hostToJoin`); this reads, probes and writes the files.
 */
export class HostLocks {
  constructor(
    private readonly home: string = studioHome(),
    private readonly caseInsensitive: boolean = caseInsensitivePaths(),
  ) {}

  key(projectDir: string): string {
    return projectKey(path.resolve(projectDir), this.caseInsensitive);
  }

  /** The host running for `projectDir` to join, or null to start one. */
  async find(projectDir: string): Promise<HostLock | null> {
    const key = this.key(projectDir);
    const lock = await this.read(key);
    if (!lock || lock.key !== key) return null;
    const alive = processAlive(lock.pid);
    return hostToJoin(lock, key, { alive, answers: alive && (await answers(lock.url)) });
  }

  /** `url` serves `projectDir` from this process: the lock is written; `release` removes it if still ours. */
  async claim(
    projectDir: string,
    url: string,
    pid: number = process.pid,
  ): Promise<{ lock: HostLock; release(): Promise<void> }> {
    const dir = path.resolve(projectDir);
    const lock: HostLock = { projectDir: dir, key: this.key(dir), url, pid };
    const file = this.file(lock.key);
    await fsp.mkdir(path.dirname(file), { recursive: true });
    // Written whole, then renamed: a reader never sees half a lock.
    const tmp = `${file}.${pid}.tmp`;
    await fsp.writeFile(tmp, JSON.stringify(lock, null, 2) + "\n", "utf8");
    await fsp.rename(tmp, file);
    return {
      lock,
      release: async () => {
        const now = await this.read(lock.key);
        if (now && now.pid === pid && now.url === url) await fsp.rm(file, { force: true });
      },
    };
  }

  private async read(key: string): Promise<HostLock | null> {
    try {
      const lock = JSON.parse(await fsp.readFile(this.file(key), "utf8")) as Partial<HostLock>;
      return typeof lock.key === "string" &&
        typeof lock.url === "string" &&
        typeof lock.pid === "number" &&
        typeof lock.projectDir === "string"
        ? (lock as HostLock)
        : null;
    } catch {
      return null;
    }
  }

  private file(key: string): string {
    const hash = createHash("sha256").update(key).digest("hex").slice(0, 16);
    return path.join(this.home, "hosts", `${hash}.json`);
  }
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** The address answers over HTTP on 127.0.0.1 within a second. */
function answers(url: string): Promise<boolean> {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return Promise.resolve(false);
  }
  if (target.hostname !== "127.0.0.1") return Promise.resolve(false);
  return new Promise((resolve) => {
    const req = request(
      { host: "127.0.0.1", port: target.port, path: "/", method: "HEAD", timeout: 1_000 },
      (res) => {
        res.resume();
        resolve(true);
      },
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(false));
    req.end();
  });
}
