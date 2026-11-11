import { toPosix } from "./workspace.js";

/**
 * The record a running core host leaves in the studio's settings folder, so
 * that a desktop window and `specgate-studio serve` on the same project find
 * it and share it instead of starting a second one (draft-desktop REQ-152,
 * REQ-158, A11).
 */
export interface HostLock {
  /** The project's folder, as the host was started on it. */
  projectDir: string;
  /** The project's key: the same for every spelling of its folder. */
  key: string;
  /** `http://127.0.0.1:<port>/`: the UI and its JSON-RPC. */
  url: string;
  /** The process that serves it. */
  pid: number;
}

/** One key per project folder: `/`-separated, no trailing `/`, lower case where the file system ignores case. */
export function projectKey(projectDir: string, caseInsensitive: boolean): string {
  const p = toPosix(projectDir);
  return caseInsensitive ? p.toLowerCase() : p;
}

/**
 * The host to join for `key`, or null to start one: a lock for the same
 * project whose process still runs and whose address still answers. Anything
 * else — no lock, another project's, a crashed host's — starts a new host,
 * which replaces the stale lock.
 */
export function hostToJoin(
  lock: HostLock | null,
  key: string,
  probe: { alive: boolean; answers: boolean },
): HostLock | null {
  if (!lock || lock.key !== key) return null;
  return probe.alive && probe.answers ? lock : null;
}
