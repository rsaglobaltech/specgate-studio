/**
 * specgate 0.34.0's own answers, kept with the core's tests
 * (packages/core/test/fixtures): `config keys --json` and a `check --last
 * --json` after a gate that failed at the tests (draft-settings, draft-report).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** A fixture of packages/core/test/fixtures, from `dist/test/` or `test/`. */
export function coreFixture(name: string): unknown {
  const at = [
    path.join(HERE, "..", "..", "..", "..", "packages", "core", "test", "fixtures", name),
    path.join(HERE, "..", "..", "..", "packages", "core", "test", "fixtures", name),
  ].find((p) => fs.existsSync(p));
  if (!at) throw new Error(`no fixture ${name}`);
  return JSON.parse(fs.readFileSync(at, "utf8"));
}
