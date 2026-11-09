/**
 * draft-specgate-port — the core knows specgate only through SpecgatePort
 * (REQ-011): the architecture check fails when packages/core imports the
 * specgate package.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);
const DEPCRUISE = path.join(
  REPO,
  "node_modules",
  "dependency-cruiser",
  "bin",
  "dependency-cruise.mjs",
);

/** dependency-cruiser over a tree laid out like this repository, with its rules. */
function cruise(files: Record<string, string>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sg-arch-"));
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  fs.copyFileSync(
    path.join(REPO, ".dependency-cruiser.cjs"),
    path.join(dir, ".dependency-cruiser.cjs"),
  );
  fs.copyFileSync(
    path.join(REPO, "tsconfig.base.json"),
    path.join(dir, "tsconfig.base.json"),
  );
  fs.copyFileSync(
    path.join(REPO, "tsconfig.depcruise.json"),
    path.join(dir, "tsconfig.depcruise.json"),
  );
  const r = spawnSync(
    process.execPath,
    [
      DEPCRUISE,
      "packages",
      "--config",
      ".dependency-cruiser.cjs",
      "--output-type",
      "err",
    ],
    { cwd: dir, encoding: "utf8" },
  );
  fs.rmSync(dir, { recursive: true, force: true });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

test("REQ-011 SCN-032: a core that imports specgate fails the architecture check, naming the rule", () => {
  const r = cruise({
    "packages/core/src/application/ProjectState.ts":
      'import { status } from "@rsaglobaltech/specgate";\nexport const x = status;\n',
  });
  assert.notEqual(r.code, 0, r.out);
  assert.match(r.out, /core-imports-nothing-outside-core/);
  assert.match(r.out, /@rsaglobaltech\/specgate/);
});

test("REQ-011 SCN-031: a core that reaches specgate only through SpecgatePort passes", () => {
  const r = cruise({
    "packages/core/src/ports/SpecgatePort.ts":
      "export interface SpecgatePort { version(): Promise<string>; }\n",
    "packages/core/src/application/UsesPort.ts":
      'import type { SpecgatePort } from "../ports/SpecgatePort.js";\nexport const use = (p: SpecgatePort) => p.version();\n',
  });
  assert.equal(r.code, 0, r.out);
});
