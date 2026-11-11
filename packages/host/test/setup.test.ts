/**
 * draft-project-setup over JSON-RPC: the five answers make a `specgate init`
 * shown before anything runs (REQ-111 SCN-332) and create the project in the
 * open folder itself (SCN-331); the adoption's preview, the readiness list and
 * the areas come from the setup's port (REQ-112 … REQ-115).
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  InMemoryFileSystem,
  type ProcessRunner,
  type SectionReader,
  type SetupPort,
} from "@specgate-studio/core";
import { startHost } from "../src/index.js";
import { client } from "./rpc.js";

const academia = {
  name: "academia",
  kind: "web",
  stack: "node-react",
  agent: "claude",
  architecture: "minimal",
};

/** A host on the folder `name`, inside a parent of its own; init writes what specgate would. */
async function host(
  name: string,
  port: Partial<SetupPort> = {},
  files: Record<string, string> = {},
) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "sg-host-setup-"));
  const projectDir = path.join(parent, name);
  fs.mkdirSync(projectDir);
  const runs: string[][] = [];
  const runner: ProcessRunner = {
    run: async (args) => {
      runs.push([...args]);
      if (args[0] === "init") {
        const out = args[args.indexOf("--out") + 1]!;
        const config = fs.readFileSync(args[args.indexOf("--config") + 1]!, "utf8");
        const slug = JSON.parse(/^PROJECT_SLUG: (.*)$/m.exec(config)![1]!) as string;
        fs.mkdirSync(path.join(out, slug, "docs", "specs"), { recursive: true });
        fs.writeFileSync(path.join(out, slug, "spec.md"), "# Spec\n");
        fs.writeFileSync(path.join(out, slug, "docs", "specs", "traceability.md"), "# M\n");
      }
      return 0;
    },
  };
  const reader: SectionReader = {
    read: async () => {
      throw new Error("not a specgate project");
    },
  };
  const root = projectDir.replace(/\\/g, "/");
  const h = await startHost({
    projectDir,
    reader,
    runner,
    port: 0,
    files: { list: async () => Object.keys(files), read: async (p) => files[p] ?? "" },
    setup: {
      port: {
        onboard: async () => ({ adopted: false, testCommand: "npm test", areas: 2, byKind: false }),
        config: async () => ({}),
        ciFile: async () => null,
        ...port,
      },
      fs: new InMemoryFileSystem(
        Object.fromEntries(Object.entries(files).map(([p, t]) => [`${root}/${p}`, t])),
      ),
      onPath: (p) => p === "claude",
    },
  });
  const ui = await client(h.url);
  return {
    ui,
    runs,
    projectDir,
    close: async () => {
      ui.close();
      await h.close();
      fs.rmSync(parent, { recursive: true, force: true });
    },
  };
}

test("REQ-111 SCN-332: the answers make the `specgate init` shown before anything runs — the folder stays empty", async () => {
  const s = await host("academia");
  try {
    const plan = await s.ui.ask<{ problem: null; config: string; commands: string[] }>(
      "setup.plan",
      academia,
    );
    assert.equal(plan.result!.problem, null);
    assert.match(plan.result!.config, /^PROJECT_SLUG: "academia"$/m);
    assert.match(plan.result!.config, /^PROJECT_TYPE: "frontend"$/m);
    assert.match(plan.result!.config, /^ARCHITECTURE: "minimal"$/m);
    assert.deepEqual(plan.result!.commands, [
      "specgate init --config academia.yaml --yes",
      "specgate agents init --tool claude",
    ]);
    const options = await s.ui.ask<{ name: string; kinds: string[] }>("setup.options", {});
    assert.equal(options.result!.name, "academia");
    assert.ok(options.result!.kinds.includes("web"));
    assert.deepEqual(s.runs, []);
    assert.deepEqual(fs.readdirSync(s.projectDir), []);
  } finally {
    await s.close();
  }
});

test("REQ-111 SCN-331: Create runs `specgate init` with the answers and the project lands in the folder itself, then the agent is wired in", async () => {
  const s = await host("academia");
  try {
    const r = await s.ui.ask<{ ok: boolean; exitCode: number }>("setup.create", academia);
    assert.deepEqual([r.result?.ok, r.result?.exitCode], [true, 0], JSON.stringify(r));
    assert.equal(s.runs[0]![0], "init");
    assert.equal(path.basename(s.runs[0]![s.runs[0]!.indexOf("--config") + 1]!), "academia.yaml");
    assert.ok(s.runs[0]!.includes("--yes"));
    assert.deepEqual(s.runs[1], ["agents", "init", "--tool", "claude"]);
    assert.ok(fs.existsSync(path.join(s.projectDir, "spec.md")));
    assert.ok(fs.existsSync(path.join(s.projectDir, "docs", "specs", "traceability.md")));
    assert.ok(!fs.existsSync(path.join(s.projectDir, "academia")), "no folder inside it");
    // The studio's own folder is gone.
    const out = s.runs[0]![s.runs[0]!.indexOf("--out") + 1]!;
    assert.ok(!fs.existsSync(out));
    const e = s.ui.notes.filter((n) => n.method === "command.event") as Array<{ params: any }>;
    assert.match(e[0]!.params.command, /^specgate init --config /);
  } finally {
    await s.close();
  }
});

test("REQ-111: answers init would refuse, or a folder with files, run nothing", async () => {
  const s = await host("academia");
  try {
    const bad = await s.ui.ask("setup.create", { ...academia, architecture: "hexagonal" });
    assert.match(bad.error!.message, /architecture/);
    const plan = await s.ui.ask<{ problem: string }>("setup.plan", { ...academia, name: "" });
    assert.match(plan.result!.problem, /name/);
    fs.writeFileSync(path.join(s.projectDir, "index.js"), "1\n");
    const notEmpty = await s.ui.ask("setup.create", academia);
    assert.match(notEmpty.error!.message, /not empty/);
    assert.deepEqual(s.runs, []);
  } finally {
    await s.close();
  }
});

test("REQ-112 REQ-113 SCN-333 SCN-335: the adoption's preview over RPC — its files and the settings it saves", async () => {
  const s = await host(
    "shop",
    {},
    {
      "package.json": '{"scripts":{"test":"node --test"}}',
      "src/billing/index.js": "1",
    },
  );
  try {
    const p = await s.ui.ask<{ files: string[]; settings: unknown }>("setup.preview", {});
    for (const f of [
      "spec.md",
      "AGENTS.md",
      "features/adoption/baseline.feature",
      "docs/specs/traceability.md",
    ])
      assert.ok(p.result!.files.includes(f), f);
    assert.deepEqual(p.result!.settings, { test_cmd: "npm test", agent: "claude" });
    assert.deepEqual(s.runs, [], "a preview runs nothing that writes");
  } finally {
    await s.close();
  }
});

test("REQ-114 REQ-115: the readiness list and the areas over RPC", async () => {
  const s = await host(
    "shop",
    {
      onboard: async () => ({ adopted: true, testCommand: "npm test", areas: 1, byKind: false }),
      config: async () => ({ test_cmd: "npm test" }),
      ciFile: async () => ".github/workflows/spec-gate.yml",
    },
    {
      "docs/specs/adoption.md":
        "## Billing\n\n- Code: `src/billing` · 1 source file\n- Tests: none found\n",
    },
  );
  try {
    const ready = await s.ui.ask<Array<{ id: string; value: string | null }>>(
      "setup.readiness",
      {},
    );
    assert.deepEqual(
      ready.result!.map((i) => i.value),
      ["npm test", null, null, ".github/workflows/spec-gate.yml"],
    );
    const areas = await s.ui.ask("setup.areas", {});
    assert.deepEqual(areas.result, {
      adopted: true,
      byKind: false,
      areas: [{ title: "Billing", folder: "src/billing", tests: [] }],
    });
  } finally {
    await s.close();
  }
});
