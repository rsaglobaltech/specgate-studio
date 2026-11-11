/**
 * draft-project-setup — the core's part: the setup a folder needs (REQ-116),
 * the five answers and the `specgate init` they make (REQ-111), the adoption's
 * preview with its files and settings (REQ-112, REQ-113), the readiness list
 * (REQ-114) and the areas adoption wrote (REQ-115).
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  ADOPT_FILES,
  Commands,
  HELP,
  InMemoryFileSystem,
  LANGS,
  Setup,
  adoptPreview,
  adoptionAreas,
  agentLabel,
  commandLine,
  hasTests,
  initArgs,
  initConfig,
  initProblem,
  readiness,
  setupStep,
  shown,
  type CommandEvent,
  type InitAnswers,
  type ProcessRunner,
  type SetupPort,
} from "../src/index.js";

const academia: InitAnswers = {
  name: "academia",
  kind: "web",
  stack: "node-react",
  agent: "claude",
  architecture: "minimal",
};

test("REQ-116 SCN-341 SCN-342: an empty folder is created, a folder with code adopted, a specgate project neither", () => {
  assert.equal(setupStep("empty"), "create");
  assert.equal(setupStep("code"), "adopt");
  assert.equal(setupStep("specgate"), null);
});

test("REQ-111 SCN-331 SCN-332: academia's answers make a config init accepts, slugged as the folder so it lands in it", () => {
  assert.equal(initProblem(academia, "academia"), null);
  const yaml = initConfig(academia, "academia");
  const config = Object.fromEntries(
    yaml
      .trim()
      .split("\n")
      .map((l) => [l.slice(0, l.indexOf(":")), JSON.parse(l.slice(l.indexOf(":") + 1))]),
  );
  assert.deepEqual(config, {
    PROJECT_NAME: "academia",
    PROJECT_SLUG: "academia",
    PROJECT_TYPE: "frontend",
    DOMAIN: "general",
    STACK: "Node.js, React, TypeScript",
    API_STYLE: "none",
    TESTING: "Vitest, Playwright",
    ARCHITECTURE: "minimal",
  });
  assert.deepEqual(initArgs("/tmp/x/academia.yaml", "/tmp/x", true), [
    "init",
    "--config",
    "/tmp/x/academia.yaml",
    "--out",
    "/tmp/x",
    "--yes",
  ]);
  assert.deepEqual(initArgs("c.yaml", "o", false).slice(-1), ["--no-git"]);
});

test("REQ-111: a name or answer init would refuse is said before anything runs", () => {
  assert.match(initProblem({ ...academia, name: "  " }, "academia")!, /name/);
  assert.match(initProblem({ ...academia, kind: "library" } as never, "academia")!, /kind/);
  assert.match(initProblem({ ...academia, architecture: "hexa" } as never, "academia")!, /arch/);
  assert.match(initProblem({ ...academia, agent: "vim" } as never, "academia")!, /agent/);
  // The folder's name is the slug: init writes the project into a folder of that name.
  assert.match(initProblem(academia, "My Project")!, /folder/);
  assert.equal(initProblem({ ...academia, agent: "none" }, "a-1"), null);
  // A quote in the name stays one YAML value.
  assert.match(
    initConfig({ ...academia, name: 'Aca "demia"' }, "academia"),
    /^PROJECT_NAME: "Aca \\"demia\\""$/m,
  );
});

test("REQ-112 SCN-333: the preview lists every file adoption writes that is not there yet", () => {
  const p = adoptPreview({
    present: new Set(["README.md"]),
    areas: 2,
    testCommand: "npm test",
    hasTests: true,
    found: ["claude"],
    config: {},
  });
  for (const f of [
    "spec.md",
    "AGENTS.md",
    "features/adoption/baseline.feature",
    "docs/specs/traceability.md",
    "docs/specs/adoption.md",
    ".github/workflows/spec-gate.yml",
  ])
    assert.ok(p.files.includes(f), f);
  assert.ok(!p.files.includes("README.md"), "an existing file is never written");
  assert.ok(ADOPT_FILES.includes("README.md"));
  const noAreas = adoptPreview({
    ...p,
    present: new Set(),
    areas: 0,
    testCommand: null,
    hasTests: false,
    found: [],
    config: {},
  });
  assert.ok(!noAreas.files.includes("docs/specs/adoption.md"));
});

test("REQ-113 SCN-335: shop with a test script and Claude Code on the PATH — test_cmd npm test and the agent, in harness.config.yaml", () => {
  const p = adoptPreview({
    present: new Set(),
    areas: 0,
    testCommand: "npm test",
    hasTests: true,
    found: ["claude"],
    config: {},
  });
  assert.deepEqual(p.settings, { test_cmd: "npm test", agent: "claude" });
  assert.equal(p.noTest, null);
  assert.ok(p.files.includes("harness.config.yaml"));
});

test("REQ-113 SCN-336: no test yet — no test command saved, and the way to set one later", () => {
  const p = adoptPreview({
    present: new Set(),
    areas: 0,
    testCommand: "npm test",
    hasTests: false,
    found: [],
    config: {},
  });
  assert.deepEqual(p.settings, { test_cmd: null, agent: null });
  assert.deepEqual(p.noTest, { detected: "npm test" });
  assert.ok(!p.files.includes("harness.config.yaml"), "nothing to save, no settings file");
  // A setting the project has already is kept, not saved again.
  const kept = adoptPreview({
    ...p,
    present: new Set(),
    areas: 0,
    testCommand: "npm test",
    hasTests: true,
    found: ["claude"],
    config: { test_cmd: "make test", agent: "x" },
  });
  assert.deepEqual(kept.settings, { test_cmd: null, agent: null });
});

test("REQ-113: tests are a test script that is not npm's placeholder, a test file, or a src/test folder", () => {
  assert.equal(hasTests('{"scripts":{"test":"node --test"}}', []), true);
  assert.equal(
    hasTests('{"scripts":{"test":"echo \\"Error: no test specified\\" && exit 1"}}', []),
    false,
  );
  assert.equal(hasTests(null, ["src/a.ts", "README.md"]), false);
  assert.equal(hasTests(null, ["src/billing/total.test.ts"]), true);
  assert.equal(hasTests(null, ["app/test_total.py"]), true);
  assert.equal(hasTests(null, ["src/test/java/a/TotalTest.java"]), true);
  assert.equal(hasTests("not json", ["pkg/total_test.go"]), true);
});

test("REQ-114 SCN-337: the readiness list — Tests, Agent, CI gate set, Architecture not", () => {
  const items = readiness(
    {
      test_cmd: "npm test",
      agent:
        "claude --output-format stream-json -p < {prompt_file} | specgate harness events --from claude",
    },
    ".github/workflows/spec-gate.yml",
  );
  assert.deepEqual(items, [
    { id: "tests", value: "npm test" },
    { id: "agent", value: "Claude Code" },
    { id: "architecture", value: null },
    { id: "ci", value: ".github/workflows/spec-gate.yml" },
  ]);
  assert.equal(agentLabel("/usr/local/bin/codex exec"), "Codex");
  assert.equal(agentLabel("my-agent --flag"), "my-agent");
});

test("REQ-114 SCN-337 SCN-338: the buttons run specgate — config set arch_cmd, agents init --tool claude, ci init", () => {
  assert.deepEqual(commandLine({ name: "config-set", key: "arch_cmd", value: "npm run arch" }), {
    args: ["config", "set", "arch_cmd", "npm run arch"],
    write: true,
  });
  assert.deepEqual(commandLine({ name: "agents-init", tool: "claude" }), {
    args: ["agents", "init", "--tool", "claude"],
    write: true,
  });
  assert.equal(commandLine({ name: "agents-init", tool: "claude,cursor" }), null);
  assert.deepEqual(commandLine({ name: "ci-init" }), { args: ["ci", "init"], write: true });
  assert.deepEqual(commandLine({ name: "adopt-preview" }), {
    args: ["adopt", "--dry-run"],
    write: false,
  });
  assert.deepEqual(commandLine({ name: "adopt" }), { args: ["adopt", "--yes"], write: true });
});

test("REQ-115 SCN-339: the areas adoption wrote, each with its folder and tests", () => {
  const md = [
    "# Areas found in shop",
    "",
    "`specgate adopt` read these areas off the code. They are not requirements.",
    "",
    '    specgate new "<a behaviour of the area, as the user sees it>"',
    "",
    "## Billing",
    "",
    "- Code: `src/billing` · 3 source files",
    "- Tests: `test/billing/total.test.js`, `src/billing/tax.test.js`",
    "",
    "## Invoices",
    "",
    "- Code: `src/invoices` · 1 source file",
    "- Tests: none found",
    "",
  ].join("\r\n");
  assert.deepEqual(adoptionAreas(md), [
    {
      title: "Billing",
      folder: "src/billing",
      tests: ["test/billing/total.test.js", "src/billing/tax.test.js"],
    },
    { title: "Invoices", folder: "src/invoices", tests: [] },
  ]);
  assert.deepEqual(adoptionAreas(""), []);
});

/** A setup over fakes: the folder `/p/shop`, specgate's JSON as given. */
function shop(over: Partial<SetupPort> = {}, files: Record<string, string> = {}) {
  const fs = new InMemoryFileSystem(
    Object.fromEntries(Object.entries(files).map(([p, t]) => [`/p/shop/${p}`, t])),
  );
  const port: SetupPort = {
    onboard: async () => ({ adopted: false, testCommand: "npm test", areas: 2, byKind: false }),
    config: async () => ({}),
    ciFile: async () => null,
    ...over,
  };
  return new Setup({
    root: "/p/shop",
    port,
    fs,
    files: async () => Object.keys(files),
    onPath: (p) => p === "claude",
  });
}

test("REQ-112 REQ-113 SCN-333 SCN-335: the preview from specgate's JSON and the folder — files, test_cmd, agent", async () => {
  const p = await shop(
    {},
    {
      "package.json": '{"scripts":{"test":"node --test"}}',
      "src/billing/a.js": "1",
    },
  ).preview();
  assert.ok(p.files.includes("spec.md") && p.files.includes("docs/specs/adoption.md"));
  assert.deepEqual(p.settings, { test_cmd: "npm test", agent: "claude" });
});

test("REQ-115 SCN-339 SCN-340: Home's areas after adoption — Billing and Invoices, or none and why", async () => {
  const adopted = await shop(
    { onboard: async () => ({ adopted: true, testCommand: null, areas: 2, byKind: false }) },
    {
      "docs/specs/adoption.md":
        "## Billing\n\n- Code: `src/billing` · 1 source file\n- Tests: none found\n\n## Invoices\n\n- Code: `src/invoices` · 1 source file\n- Tests: none found\n",
    },
  ).areas();
  assert.deepEqual(adopted, {
    adopted: true,
    byKind: false,
    areas: [
      { title: "Billing", folder: "src/billing", tests: [] },
      { title: "Invoices", folder: "src/invoices", tests: [] },
    ],
  });
  const byKind = await shop({
    onboard: async () => ({ adopted: true, testCommand: null, areas: 0, byKind: true }),
  }).areas();
  assert.deepEqual(byKind, { adopted: true, byKind: true, areas: [] });
});

test("REQ-114: readiness from `config list` and `ci status`", async () => {
  const items = await shop({
    config: async () => ({ test_cmd: "npm test" }),
    ciFile: async () => ".github/workflows/spec-gate.yml",
  }).readiness();
  assert.deepEqual(
    items.map((i) => [i.id, i.value]),
    [
      ["tests", "npm test"],
      ["agent", null],
      ["architecture", null],
      ["ci", ".github/workflows/spec-gate.yml"],
    ],
  );
});

test("REQ-111: init runs as one write — its events told, the command shown, a second write refused meanwhile", async () => {
  const seen: string[][] = [];
  let release!: () => void;
  const runner: ProcessRunner = {
    run: async (args) => {
      seen.push([...args]);
      await new Promise<void>((ok) => (release = ok));
      return 0;
    },
  };
  const commands = new Commands(runner);
  const events: CommandEvent[] = [];
  commands.onEvent((e) => events.push(e));
  const running = commands.runInit("/t/academia.yaml", "/t", true);
  await new Promise((ok) => setTimeout(ok, 0));
  const busy = await commands.run({ name: "adopt" });
  assert.equal(busy.ok, false);
  release();
  const done = await running;
  assert.ok(done.ok && done.exitCode === 0);
  assert.deepEqual(seen, [initArgs("/t/academia.yaml", "/t", true)]);
  assert.equal(
    (events[0] as { command: string }).command,
    shown(initArgs("/t/academia.yaml", "/t", true)),
  );
  const ended = events.at(-1) as Extract<CommandEvent, { type: "ended" }>;
  assert.match(ended.notice!.en.ran, /specgate init/);
});

test("REQ-111 REQ-112 REQ-114: init, adopt, agents init and ci init say what they do, in English and Spanish", () => {
  for (const action of ["init", "adopt", "agents-init", "ci-init"] as const) {
    for (const lang of LANGS) assert.ok(HELP[action][lang], `${action} ${lang}`);
  }
});
