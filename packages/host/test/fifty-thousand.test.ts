/**
 * draft-workspace — the watcher keeps up with 50,000 files (REQ-023, A3): a
 * save reaches the core host within 500 ms, with the project's 50,000 files
 * committed in git and watched.
 */
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { Section, SectionReader, WorkspaceState } from "@specgate-studio/core";
import { HostRegistry, startProjectHost, type Host } from "../src/index.js";
import { client } from "./rpc.js";

const FILES = 50_000;
let parent = "";
let project = "";
let home = "";
const reads: Array<{ section: Section; at: number }> = [];
let registry: HostRegistry;
let host: Host;

function write(rel: string, text: string): void {
  fs.writeFileSync(path.join(project, rel), text);
}

function git(...args: string[]): void {
  const r = spawnSync(
    "git",
    ["-c", "user.name=T", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", ...args],
    { cwd: project, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 },
  );
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
}

before(async () => {
  parent = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "sg-50k-")));
  project = path.join(parent, "big").split(path.sep).join("/");
  home = path.join(parent, "home");
  // 50,000 files outside the ignored folders: 500 folders of 100. One content
  // for all, so git stores one object — 50,000 distinct ones take a minute to add.
  const n = FILES - 3;
  for (let d = 0; d * 100 < n; d++) {
    const dir = path.join(project, "src", `m${d}`);
    fs.mkdirSync(dir, { recursive: true });
    for (let f = 0; f < 100 && d * 100 + f < n; f++) {
      fs.writeFileSync(path.join(dir, `f${f}.ts`), "export {};\n");
    }
  }
  fs.mkdirSync(path.join(project, "docs/specs/changes/draft-pedidos"), { recursive: true });
  write("docs/specs/traceability.md", "# Traceability\n");
  write("docs/specs/changes/draft-pedidos/questions.md", "# Questions\n");
  write("spec.md", "# Spec\n");
  git("init", "-q", "-b", "main");
  git("add", "-A");
  git("commit", "-qm", "50,000 files");

  const reader = (): SectionReader => ({
    read: async (section) => (reads.push({ section, at: performance.now() }), { section }),
  });
  registry = new HostRegistry((dir) => startProjectHost(dir, { home, reader, registry }), false);
  host = (await registry.open(project)).host;
  // The watch is set up when the host answers; FSEvents starts a moment later.
  await new Promise((r) => setTimeout(r, 300));
});

after(async () => {
  await registry?.closeAll();
  fs.rmSync(parent, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
});

const until = async (ok: () => boolean, ms: number) => {
  const end = performance.now() + ms;
  while (!ok() && performance.now() < end) await new Promise((r) => setTimeout(r, 2));
  return ok();
};

test("REQ-023 SCN-065: in a project of 50,000 files, saving draft-pedidos/questions.md reads Questions again within 500 ms", async (t) => {
  const ui = await client(host.url);
  await ui.ask("project.open");
  const saved = performance.now();
  write("docs/specs/changes/draft-pedidos/questions.md", "# Questions\n\n## Q1\n");
  await until(() => reads.some((r) => r.section === "questions" && r.at > saved), 3000);
  const reread = reads.find((r) => r.section === "questions" && r.at > saved);
  assert.ok(reread, "Questions read again");
  const ms = reread.at - saved;
  t.diagnostic(`SCN-065 ${ms.toFixed(0)} ms`);
  assert.ok(ms < 500, `Questions read again ${ms.toFixed(0)} ms after the save`);
  ui.close();
});

test("REQ-023 SCN-066: in a project of 50,000 files, saving spec.md shows in the uncommitted files within 500 ms", async (t) => {
  const ui = await client(host.url);
  const before = await ui.ask<WorkspaceState>("workspace.get");
  assert.equal(before.result?.git?.total, 0, "nothing uncommitted before the save");
  const saved = performance.now();
  write("spec.md", "# Spec\n\nchanged\n");
  const told = () =>
    ui.notes.find(
      (n) =>
        n.method === "workspace.changed" &&
        (n.params as { state: WorkspaceState }).state.git?.uncommitted.some(
          (g) => g.group === "specification",
        ),
    );
  await until(() => Boolean(told()), 3000);
  const note = told();
  assert.ok(note, "the save told to the UI");
  const ms = note.at - saved;
  t.diagnostic(`SCN-066 ${ms.toFixed(0)} ms`);
  assert.ok(ms < 500, `the save in the uncommitted files ${ms.toFixed(0)} ms after it`);
  ui.close();
});
