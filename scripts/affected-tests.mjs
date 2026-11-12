#!/usr/bin/env node
/**
 * The studio's fast gate (harness.config.yaml `test_cmd_affected`): specgate
 * `check --affected` and `apply` hand it the TypeScript test files a change
 * reaches as `{files}`; this runs their compiled JavaScript — what
 * `npm run build` writes — with `node --test`, the perf tests one at a time as
 * `npm test` runs them. `test_cmd` stays the whole suite, and CI runs it.
 *
 *   packages/<p>/test/x.test.ts  → packages/<p>/dist/test/x.test.js
 *   apps/cli/test/x.e2e.test.ts  → apps/cli/dist/test/x.e2e.test.js
 *   apps/ui/test/x.test.ts       → apps/ui/dist-test/test/x.test.js
 *
 * A file that is not a test (a fixture, a helper) is left out: the tests that
 * import it are among the files given. Paths may use `\` or `/`.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const TEST = /\.(perf-)?test\.(ts|tsx|js)$/;

/** The compiled test of a TypeScript test file, or null for anything that is not a test. */
export function compiled(file) {
  const p = file.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!TEST.test(p)) return null;
  if (p.endsWith(".js")) return p;
  const js = p.replace(/\.tsx?$/, ".js");
  let m = /^(packages\/[^/]+|apps\/cli)\/test\/(.+)$/.exec(js);
  if (m) return `${m[1]}/dist/test/${m[2]}`;
  m = /^apps\/ui\/test\/(.+)$/.exec(js);
  if (m) return `apps/ui/dist-test/test/${m[1]}`;
  return null;
}

function run(args) {
  const r = spawnSync(process.execPath, args, { stdio: "inherit" });
  return r.status ?? 1;
}

const given = process.argv.slice(2);
const files = [...new Set(given.map(compiled).filter((f) => f !== null))];
const missing = files.filter((f) => !existsSync(f));
if (missing.length) {
  console.error(`Not built: ${missing.join(", ")} — run \`npm run build\` first.`);
  process.exit(1);
}
const unit = files.filter((f) => !f.endsWith(".perf-test.js"));
const perf = files.filter((f) => f.endsWith(".perf-test.js"));
console.log(
  `affected tests: ${files.length} of ${given.length} file(s) given` +
    (files.length ? `\n  ${files.join("\n  ")}` : " — nothing to run"),
);
let code = 0;
if (unit.length) code = run(["--test", ...unit]) || code;
if (perf.length) code = run(["--test", "--test-concurrency=1", ...perf]) || code;
process.exit(code);
