/**
 * draft-workspace — the open folder through the host's RPC: its kind, the
 * recent projects and one host per open project (REQ-021, REQ-022, REQ-026).
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { Section, SectionReader, WorkspaceState, RecentProject } from "@specgate-studio/core";
import { HostRegistry, startProjectHost, type Host } from "../src/index.js";
import { client } from "./rpc.js";

function tmp(prefix: string): string {
  return fs
    .realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)))
    .split(path.sep)
    .join("/");
}
function write(root: string, rel: string, text = "x\n"): void {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text);
}
const rm = (p: string) => fs.rmSync(p, { recursive: true, force: true });

/** A reader that counts the projects it was made for and the sections it read. */
function spyReader() {
  const made: string[] = [];
  const reads: Section[] = [];
  const reader = (dir: string): SectionReader => {
    made.push(dir);
    return { read: async (s) => (reads.push(s), { section: s }) };
  };
  return { reader, made, reads };
}

test("REQ-021 SCN-061: sprich opened is a Specgate project, and its Home is read", async () => {
  const parent = tmp("sg-host-061-");
  const sprich = `${parent}/sprich`;
  write(sprich, "docs/specs/traceability.md", "# T\n");
  const spy = spyReader();
  const host = await startProjectHost(sprich, { home: `${parent}/home`, reader: spy.reader });
  try {
    const ui = await client(host.url);
    const ws = await ui.ask<WorkspaceState>("workspace.get");
    assert.equal(ws.result?.kind, "specgate");
    assert.equal(ws.result?.name, "sprich");
    const opened = await ui.ask<{ sections: Record<string, unknown> }>("project.open");
    assert.ok(opened.result?.sections.home, "Home is read");
    ui.close();
  } finally {
    await host.close();
    rm(parent);
  }
});

test("REQ-021 SCN-062: nuevo, with nothing but .git, is an Empty folder, and no specgate command runs for it", async () => {
  const parent = tmp("sg-host-062-");
  const nuevo = `${parent}/nuevo`;
  fs.mkdirSync(path.join(nuevo, ".git"), { recursive: true });
  const spy = spyReader();
  const host = await startProjectHost(nuevo, { home: `${parent}/home`, reader: spy.reader });
  try {
    const ui = await client(host.url);
    const ws = await ui.ask<WorkspaceState>("workspace.get");
    assert.equal(ws.result?.kind, "empty");
    assert.equal(ws.result?.git, null, ".git holds no repository");
    assert.deepEqual(spy.made, [], "no specgate reader made");
    assert.deepEqual(spy.reads, []);
    ui.close();
  } finally {
    await host.close();
    rm(parent);
  }
});

test("REQ-022 SCN-064: a build writing apps/web/dist reads no section again", async () => {
  const parent = tmp("sg-host-064-");
  const sprich = `${parent}/sprich`;
  write(sprich, "docs/specs/traceability.md", "# T\n");
  write(sprich, "apps/web/src/main.ts");
  const spy = spyReader();
  const host = await startProjectHost(sprich, { home: `${parent}/home`, reader: spy.reader });
  try {
    const ui = await client(host.url);
    await ui.ask("project.open");
    const before = spy.reads.length;
    await new Promise((r) => setTimeout(r, 150));
    for (let i = 0; i < 10; i++) write(sprich, `apps/web/dist/chunk${i}.js`);
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(spy.reads.length, before, "no section read again");
    assert.deepEqual(
      ui.notes.filter((n) => n.method === "state.changed"),
      [],
      "no state change told",
    );
    ui.close();
  } finally {
    await host.close();
    rm(parent);
  }
});

test("REQ-026 SCN-072: picking sprich from the recent projects of another project's host opens it in its own host, sprich first", async () => {
  const parent = tmp("sg-host-072-");
  const home = `${parent}/home`;
  for (const p of ["sprich", "billing"])
    write(`${parent}/${p}`, "docs/specs/traceability.md", "# T\n");
  const spy = spyReader();
  const registry: HostRegistry = new HostRegistry(
    (dir) => startProjectHost(dir, { home, reader: spy.reader, registry }),
    false,
  );
  const sprichHost = await startProjectHost(`${parent}/sprich`, { home, reader: spy.reader });
  await sprichHost.close();
  const billing = await startProjectHost(`${parent}/billing`, {
    home,
    reader: spy.reader,
    registry,
  });
  try {
    const ui = await client(billing.url);
    const before = await ui.ask<RecentProject[]>("recent.list");
    assert.deepEqual(
      before.result?.map((r) => r.name),
      ["billing", "sprich"],
    );
    const answer = await ui.ask<{ url: string; reused: boolean }>("recent.open", {
      path: `${parent}/sprich`,
    });
    assert.equal(answer.result?.reused, false);
    assert.match(answer.result?.url ?? "", /^ws:\/\/127\.0\.0\.1:\d+\/$/);
    assert.notEqual(answer.result?.url, billing.url, "a host of its own");
    const sprichUi = await client(answer.result!.url);
    const ws = await sprichUi.ask<WorkspaceState>("workspace.get");
    assert.equal(ws.result?.name, "sprich");
    const after = await sprichUi.ask<RecentProject[]>("recent.list");
    assert.equal(after.result?.[0]?.name, "sprich");
    sprichUi.close();
    ui.close();
  } finally {
    await registry.closeAll();
    rm(parent);
  }
});

test("REQ-026 SCN-073: sprich and billing open; picking sprich from billing's window answers sprich's host, and none is started", async () => {
  const started: string[] = [];
  const hosts: Host[] = [];
  const parent = tmp("sg-host-073-");
  const home = `${parent}/home`;
  for (const p of ["sprich", "billing"])
    write(`${parent}/${p}`, "docs/specs/traceability.md", "# T\n");
  const spy = spyReader();
  const registry: HostRegistry = new HostRegistry(async (dir) => {
    started.push(dir);
    const h = await startProjectHost(dir, { home, reader: spy.reader, registry });
    hosts.push(h);
    return h;
  }, false);
  try {
    const sprich = await registry.open(`${parent}/sprich`);
    const billing = await registry.open(`${parent}/billing`);
    const ui = await client(billing.url);
    const answer = await ui.ask<{ url: string; reused: boolean }>("recent.open", {
      path: `${parent}/sprich/`,
    });
    assert.deepEqual(answer.result, { url: sprich.url, reused: true });
    assert.equal(started.length, 2, "no second host for sprich");
    assert.equal(registry.size, 2);
    ui.close();
  } finally {
    await registry.closeAll();
    rm(parent);
  }
});

test("REQ-026: on Windows and macOS the registry knows a project in another case", async () => {
  let n = 0;
  const fake = {
    url: "ws://127.0.0.1:1/",
    state: undefined as never,
    close: async () => undefined,
  };
  const registry = new HostRegistry(async () => (n++, fake), true);
  await registry.open("C:/Users/dev/Sprich");
  const again = await registry.open("c:\\users\\dev\\sprich");
  assert.equal(again.reused, true);
  assert.equal(n, 1);
});
