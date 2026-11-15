import { createHash } from "node:crypto";
import { promises as fsp } from "node:fs";
import { request } from "node:http";
import WebSocket from "ws";
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
    secret: string,
    pid: number = process.pid,
  ): Promise<{ lock: HostLock; release(): Promise<void> }> {
    const dir = path.resolve(projectDir);
    const lock: HostLock = { projectDir: dir, key: this.key(dir), url, pid, secret };
    const file = this.file(lock.key);
    // The Developer's alone: the lock holds a token of the host (A2).
    await fsp.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    // Written whole, then renamed: a reader never sees half a lock.
    const tmp = `${file}.${pid}.tmp`;
    await fsp.writeFile(tmp, JSON.stringify(lock, null, 2) + "\n", {
      encoding: "utf8",
      mode: 0o600,
    });
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
        typeof lock.projectDir === "string" &&
        typeof lock.secret === "string"
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

/**
 * A token of its own for a window or a tab joining the host of `lock`: asked
 * of that host with the lock's secret (draft-desktop A2, A11).
 */
export function joinToken(lock: HostLock, wait = 5_000): Promise<string> {
  const ws = new WebSocket(lock.url.replace(/^http/, "ws"), {
    headers: { authorization: `Bearer ${lock.secret ?? ""}` },
  });
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("the studio's host did not answer")), wait);
    const done = (e: Error | null, token?: string) => {
      clearTimeout(timer);
      ws.close();
      if (e) reject(e);
      else resolve(token!);
    };
    ws.once("error", (e) => done(e));
    ws.once("unexpected-response", (_r, res) =>
      done(new Error(`the studio's host refused to be joined (${res.statusCode})`)),
    );
    ws.once("open", () =>
      ws.send(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "session.issue" })),
    );
    ws.on("message", (raw) => {
      const m = JSON.parse(String(raw)) as { id?: unknown; result?: { token?: unknown } };
      if (m.id !== 1) return;
      const t = m.result?.token;
      if (typeof t === "string") done(null, t);
      else done(new Error("the studio's host gave no token"));
    });
  });
}
