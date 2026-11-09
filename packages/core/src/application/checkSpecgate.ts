import { isOlder, updateCommand } from "../domain/version.js";
import type { SpecgatePort } from "../ports/SpecgatePort.js";

export type SpecgateCheck =
  | { ok: true; version: string }
  | { ok: false; code: "specgate_outdated" | "specgate_missing"; message: string; fix: string };

/**
 * When the host starts (REQ-013): the installed specgate against the version
 * the studio needs. Older, or none at all, is said with both versions and the
 * command that fixes it — and the host reads no section until it is fixed.
 */
export async function checkSpecgate(
  specgate: Pick<SpecgatePort, "version">,
  needed: string,
): Promise<SpecgateCheck> {
  let version: string;
  try {
    version = await specgate.version();
  } catch {
    return {
      ok: false,
      code: "specgate_missing",
      message: `specgate is not installed; the studio needs ${needed}`,
      fix: updateCommand(needed),
    };
  }
  if (isOlder(version, needed)) {
    return {
      ok: false,
      code: "specgate_outdated",
      message: `specgate ${version} is installed; the studio needs ${needed}`,
      fix: updateCommand(needed),
    };
  }
  return { ok: true, version };
}
