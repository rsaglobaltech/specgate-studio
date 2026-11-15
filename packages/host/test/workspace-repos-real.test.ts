/**
 * workspace-repos against a real specgate 1.0 (REQ-218): truck-workspace,
 * made by `specgate workspace init` beside truck-fleet and truck-web, opens
 * as a workspace — not a folder to adopt — and lists both repositories with
 * their requirements; "Open fleet" opens truck-fleet in a host of its own.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { specgateBin } from "@specgate-studio/adapter-specgate-cli";
import type { WorkspaceState, WorkspaceView } from "@specgate-studio/core";
import { HostRegistry, startProjectHost, type Host } from "../src/index.js";
import { client } from "./rpc.js";

function specgate(dir: string, ...args: string[]) {
  const r = spawnSync(process.execPath, [specgateBin(), ...args], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", CI: "1" },
  });
  assert.equal(r.status, 0, `specgate ${args.join(" ")}: ${r.stdout}${r.stderr}`);
  return r.stdout;
}

/** truck-fleet and truck-web, and truck-workspace beside them naming both. */
function truck() {
  const parent = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "sg-ws-")));
  for (const n of ["fleet", "web"]) {
    const config = path.join(parent, `${n}.yaml`);
    fs.writeFileSync(
      config,
      `PROJECT_NAME: Truck ${n}\nPROJECT_SLUG: truck-${n}\nPROJECT_TYPE: backend\nDOMAIN: general\n` +
        `STACK: Node.js\nAPI_STYLE: REST\nTESTING: node --test\n`,
    );
    specgate(
      parent,
      "init",
      "--config",
      config,
      "--out",
      parent,
      "--no-git",
      "--no-agents",
      "--no-ci",
    );
    fs.rmSync(config);
  }
  const workspace = path.join(parent, "truck-workspace");
  fs.mkdirSync(workspace);
  specgate(workspace, "workspace", "init", "--name", "truck");
  return { parent, workspace };
}

test("REQ-218 SCN-981 SCN-982: truck-workspace opens as a workspace with fleet and web; Open fleet opens truck-fleet in its own host", async () => {
  const t = truck();
  const home = path.join(t.parent, "home");
  const registry: HostRegistry = new HostRegistry(
    (dir): Promise<Host> => startProjectHost(dir, { home, registry, port: 0 }),
    false,
  );
  const host = await startProjectHost(t.workspace, { home, registry });
  const ui = await client(host.url);
  try {
    const ws = (await ui.ask<WorkspaceState>("workspace.get")).result!;
    assert.equal(ws.kind, "workspace");

    const view = (await ui.ask<WorkspaceView>("workspace.repos")).result!;
    assert.equal(view.name, "truck");
    const posix = (p: string) => p.replace(/\\/g, "/");
    assert.deepEqual(
      view.repos.map((r) => [r.name, r.role, r.exists, r.requirements?.total, r.dir]),
      [
        ["fleet", "service", true, 1, posix(path.join(t.parent, "truck-fleet"))],
        ["web", "web", true, 1, posix(path.join(t.parent, "truck-web"))],
      ],
    );

    const opened = (
      await ui.ask<{ url: string; reused: boolean }>("recent.open", { path: view.repos[0]!.dir })
    ).result!;
    assert.notEqual(opened.url, host.url, "a host of its own");
    const fleet = await client(opened.url);
    const fleetState = (await fleet.ask<WorkspaceState>("workspace.get")).result!;
    assert.equal(fleetState.kind, "specgate");
    assert.equal(fleetState.name, "truck-fleet");
    // Its Home read through, so no specgate it started still runs in truck-fleet when it closes
    // (Windows keeps a folder a process works in).
    const fleetHome = await fleet.ask("home.get");
    assert.equal(fleetHome.error, undefined, JSON.stringify(fleetHome.error));
    fleet.close();
  } finally {
    ui.close();
    await host.close();
    await registry.closeAll();
    await fs.promises.rm(t.parent, {
      recursive: true,
      force: true,
      maxRetries: 60,
      retryDelay: 250,
    });
  }
});
