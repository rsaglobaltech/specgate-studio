/**
 * draft-specgate-port — the installed specgate checked at start (REQ-013).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { checkSpecgate, isOlder, type SpecgatePort } from "../src/index.js";

const installed = (v: string): Pick<SpecgatePort, "version"> => ({ version: async () => v });

test("REQ-013 SCN-035: 0.29.1 installed, 0.30.0 needed — both versions said, and the command that updates it", async () => {
  const r = await checkSpecgate(installed("0.29.1"), "0.30.0");
  assert.deepEqual(r, {
    ok: false,
    code: "specgate_outdated",
    message: "specgate 0.29.1 is installed; the studio needs 0.30.0",
    fix: "npm i -g @rsaglobaltech/specgate@0.30.0",
  });
});

test("REQ-013: the needed version or a newer one is fine", async () => {
  assert.deepEqual(await checkSpecgate(installed("0.30.0"), "0.30.0"), {
    ok: true,
    version: "0.30.0",
  });
  assert.deepEqual(await checkSpecgate(installed("0.31.0"), "0.30.0"), {
    ok: true,
    version: "0.31.0",
  });
  assert.deepEqual(await checkSpecgate(installed("1.0.0"), "0.30.0"), {
    ok: true,
    version: "1.0.0",
  });
});

test("REQ-013: versions compare as numbers, a pre-release before its release", () => {
  assert.equal(isOlder("0.9.0", "0.10.0"), true);
  assert.equal(isOlder("0.10.0", "0.9.0"), false);
  assert.equal(isOlder("1.0.0-rc.11", "1.0.0"), true);
  assert.equal(isOlder("1.0.0", "1.0.0-rc.11"), false);
});

test("REQ-013: no specgate at all says how to install it", async () => {
  const missing: Pick<SpecgatePort, "version"> = {
    version: async () => {
      throw new Error("spawn specgate ENOENT");
    },
  };
  const r = await checkSpecgate(missing, "0.30.0");
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.code, "specgate_missing");
  assert.equal(!r.ok && r.fix, "npm i -g @rsaglobaltech/specgate@0.30.0");
});
