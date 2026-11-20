/**
 * specgate-1-4-gate REQ-222: the studio needs specgate 1.4.0, and every host
 * `serve` and the desktop sidecar start checks it (REQ-013's notice), not
 * only a host a test wires by hand.
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { SPECGATE_NEEDS, startProjectHost } from "../src/index.js";
import { client } from "./rpc.js";

function scratch() {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "sg-needs-"));
  const dir = path.join(parent, "sprich");
  fs.mkdirSync(dir);
  return { parent, dir, home: path.join(parent, "home") };
}

test("REQ-222: the studio needs 1.4.0, and its package depends on ^1.4.0", () => {
  assert.equal(SPECGATE_NEEDS, "1.4.0");
  const root = fileURLToPath(new URL("../../../../package.json", import.meta.url));
  const pkg = JSON.parse(fs.readFileSync(root, "utf8"));
  assert.equal(pkg.devDependencies["@rsaglobaltech/specgate"], `^${SPECGATE_NEEDS}`);
});

test("REQ-222 SCN-991: specgate 1.0.0 installed — opening the project says 1.4.0 is needed and the command that updates it", async () => {
  const p = scratch();
  const host = await startProjectHost(p.dir, {
    home: p.home,
    specgateVersion: { version: async () => "1.0.0" },
  });
  const ui = await client(host.url);
  try {
    const opened = await ui.ask("project.open");
    assert.equal(opened.error?.code, -32001);
    assert.match(
      opened.error?.message ?? "",
      /specgate 1\.0\.0 is installed; the studio needs 1\.4\.0/,
    );
    assert.match(opened.error?.message ?? "", /npm i -g @rsaglobaltech\/specgate@1\.4\.0/);
  } finally {
    ui.close();
    await host.close();
    fs.rmSync(p.parent, { recursive: true, force: true });
  }
});

test("REQ-222 SCN-992: specgate 1.4.2 installed — the project opens with no notice about the version", async () => {
  const p = scratch();
  const host = await startProjectHost(p.dir, {
    home: p.home,
    specgateVersion: { version: async () => "1.4.2" },
  });
  const ui = await client(host.url);
  try {
    const opened = await ui.ask("project.open");
    assert.notEqual(opened.error?.code, -32001, JSON.stringify(opened.error));
  } finally {
    ui.close();
    await host.close();
    fs.rmSync(p.parent, { recursive: true, force: true });
  }
});
