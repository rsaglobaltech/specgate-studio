/**
 * draft-brief in the core: the brief's checks on every save, in Problems
 * (REQ-072), and "Draft the modules" one module at a time with the project's
 * agent (REQ-073) — every value read from specgate's `--json` answers.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  BRIEF_FILE,
  Brief,
  Commands,
  HELP,
  commandLine,
  explain,
  fromWire,
  missingTranslations,
  type CommandEvent,
  type Finding,
  type ProcessRunner,
  type SpecgateAnswer,
} from "../src/index.js";

/** `propose --from-brief --check --brief docs/brief.md --json`'s B6 finding, as specgate 0.33.2 says it. */
const B6: Finding = {
  severity: "warning",
  code: "B6_unmeasured",
  message: '"Shipping is free above some amount." promises a quantity and states no number.',
  target: "pedidos",
  fix: 'Give the number and its unit: "within 2 seconds", "for 500 students at once".',
  line: 18,
  file: "docs/brief.md",
};

const checked = (findings: Finding[]): SpecgateAnswer => ({
  data: {
    draft: {
      brief: "docs/brief.md",
      ready: true,
      errors: 0,
      warnings: findings.length,
      next: "specgate propose --from-brief pedidos",
    },
  },
  findings,
  exitCode: 0,
});

const idle: ProcessRunner = { run: async () => 0 };

/** A Brief over Commands and a recorded specgate; `answer` says what each call answers. */
function brief(answer: (args: string) => SpecgateAnswer | Promise<SpecgateAnswer>) {
  const calls: string[] = [];
  const specgate = {
    call: async (args: readonly string[]) => {
      calls.push(args.join(" "));
      return answer(args.join(" "));
    },
  };
  const commands = new Commands(idle, { json: specgate });
  const events: CommandEvent[] = [];
  commands.onEvent((e) => events.push(e));
  return { brief: new Brief(commands, specgate), calls, events, commands };
}

test("REQ-072: the brief's check is `propose --from-brief --check --brief docs/brief.md`, run with --json, writing nothing", () => {
  assert.equal(BRIEF_FILE, "docs/brief.md");
  assert.deepEqual(commandLine({ name: "brief-check" }), {
    args: ["propose", "--from-brief", "--check", "--brief", "docs/brief.md"],
    write: false,
    json: true,
  });
});

test('REQ-072 SCN-213: "free above some amount" saved — Problems has B6_unmeasured at its line, with the fix asking for a number', async () => {
  const b = brief(() => checked([B6]));
  assert.deepEqual(b.brief.problems(), []);
  const found = await b.brief.saved(BRIEF_FILE);
  assert.deepEqual(b.calls, ["propose --from-brief --check --brief docs/brief.md"]);
  assert.deepEqual(found, [B6]);
  assert.deepEqual(b.brief.problems(), [B6]);
  const [f] = b.brief.problems();
  assert.equal(f!.code, "B6_unmeasured");
  assert.equal(f!.line, 18);
  assert.match(f!.fix!, /number/);
  // Told as any run: started, the finding as output, and a notice naming Problems.
  assert.equal(b.events[0]!.type, "started");
  assert.equal(
    (b.events[0] as { command: string }).command,
    "specgate propose --from-brief --check --brief docs/brief.md",
  );
  assert.ok(
    b.events.some((e) => e.type === "output" && e.chunk.includes("B6_unmeasured")),
    "the terminal shows the finding",
  );
  const end = b.events.at(-1) as Extract<CommandEvent, { type: "ended" }>;
  assert.equal(end.notice?.en.tone, "ok");
  assert.match(end.notice!.en.ran, /Problems/);
  assert.match(end.notice!.es.ran, /Problemas/);
  assert.equal(end.notice!.en.wrote, "No file was written.");
});

test('REQ-072 SCN-214: the rule rewritten as "free above 50 EUR" and saved — the finding goes', async () => {
  let findings = [B6];
  const b = brief(() => checked(findings));
  await b.brief.saved(BRIEF_FILE);
  assert.equal(b.brief.problems().length, 1);
  findings = [];
  assert.deepEqual(await b.brief.saved(BRIEF_FILE), []);
  assert.deepEqual(b.brief.problems(), []);
});

test("REQ-072: saving any other file runs no check; a check answered after a newer one is dropped", async () => {
  const b = brief(() => checked([B6]));
  assert.equal(await b.brief.saved("spec.md"), null);
  assert.equal(await b.brief.saved("docs/specs/changes/draft-brief/proposal.md"), null);
  assert.deepEqual(b.calls, []);

  // Two saves in a row: the first check answers last, and Problems keeps the second's.
  const slow: Array<(a: SpecgateAnswer) => void> = [];
  const c = brief(() => new Promise<SpecgateAnswer>((ok) => slow.push(ok)));
  const first = c.brief.saved(BRIEF_FILE);
  await new Promise((ok) => setImmediate(ok));
  const second = c.brief.saved(BRIEF_FILE);
  await new Promise((ok) => setImmediate(ok));
  slow[1]!(checked([]));
  await second;
  slow[0]!(checked([B6]));
  await first;
  assert.deepEqual(c.brief.problems(), []);
});

test("REQ-072: a brief specgate cannot read is told with its finding, in Problems and in the notice", async () => {
  const none: Finding = {
    severity: "error",
    code: "draft_no_brief",
    message: "No plan or brief at docs/brief.md.",
    fix: "Save your plan or brief as docs/brief.md — any markdown — then run `specgate propose --from-brief`.",
  };
  const b = brief(() => ({ data: { draft: null }, findings: [none], exitCode: 1 }));
  assert.deepEqual(await b.brief.saved(BRIEF_FILE), [none]);
  const end = b.events.at(-1) as Extract<CommandEvent, { type: "ended" }>;
  assert.equal(end.notice?.en.tone, "refused");
  assert.match(end.notice!.en.ran, /draft_no_brief/);
});

test("REQ-072: the brief's check explains itself in English and Spanish", () => {
  assert.deepEqual(missingTranslations(HELP), []);
  const en = explain("brief-check", "en");
  assert.equal(en.command, "specgate propose --from-brief --check --brief docs/brief.md");
  assert.match(en.does, /every save/);
  assert.match(en.files, /None/);
  const es = explain("brief-check", "es");
  assert.match(es.does, /cada vez que guardas/);
});

/** `propose --from-brief --json`: sprich's modules and where each stands. */
const modules = (states: Record<string, string>): SpecgateAnswer => ({
  data: {
    draft: {
      brief: "docs/brief.md",
      modules: Object.entries(states).map(([module, state]) => ({
        module,
        change: `draft-${module}`,
        findings: 0,
        state,
      })),
      next: "specgate propose --from-brief pedidos",
    },
  },
  findings: [],
  exitCode: 0,
});

const config = (agent?: string): SpecgateAnswer => ({
  data: { config: agent ? { agent, test_cmd: "npm test" } : { test_cmd: "npm test" } },
  findings: [],
  exitCode: 0,
});

const drafted = (module: string): SpecgateAnswer => ({
  data: {
    draft: {
      module,
      change: `draft-${module}`,
      state: "ready",
      brief: "docs/brief.md",
      next: "specgate apply",
    },
  },
  findings: [],
  exitCode: 0,
});

test("REQ-073: a module drafted with the agent is `propose --from-brief <module> --agent <agent>`, a write run with --json; never from the wire", () => {
  assert.deepEqual(commandLine({ name: "draft-module", module: "pedidos", agent: "claude -p" }), {
    args: ["propose", "--from-brief", "pedidos", "--agent", "claude -p"],
    write: true,
    json: true,
  });
  assert.equal(commandLine({ name: "draft-module", module: "--check", agent: "claude -p" }), null);
  assert.equal(commandLine({ name: "draft-module", module: "../x", agent: "claude -p" }), null);
  assert.equal(commandLine({ name: "draft-module", module: "pedidos", agent: "" }), null);
  assert.equal(commandLine({ name: "draft-module", module: "pedidos", agent: "--json" }), null);
  // The agent is the project's (A6): a request over the wire never names it.
  assert.equal(fromWire({ name: "draft-module", module: "pedidos", agent: "rm -rf ." }), false);
  assert.equal(fromWire({ name: "check" }), true);
  // Its reads: the brief's modules and the project's settings.
  assert.deepEqual(commandLine({ name: "brief-modules" }), {
    args: ["propose", "--from-brief"],
    write: false,
    json: true,
  });
  assert.deepEqual(commandLine({ name: "config-list" }), {
    args: ["config", "list"],
    write: false,
    json: true,
  });
});

test('REQ-073 SCN-215: "Draft the modules" with pedidos and pagos not drafted — pedidos with the agent, pagos only after it ended', async () => {
  const pending: Record<string, (a: SpecgateAnswer) => void> = {};
  const b = brief((args) => {
    if (args === "config list") return config("claude -p");
    if (args === "propose --from-brief")
      return modules({ pedidos: "not started", pagos: "not started" });
    return new Promise<SpecgateAnswer>((ok) => (pending[args] = ok));
  });
  const run = b.brief.draft();
  const until = async (args: string) => {
    for (let i = 0; i < 100 && !pending[args]; i++) await new Promise((ok) => setImmediate(ok));
    assert.ok(pending[args], `${args} started`);
  };
  await until("propose --from-brief pedidos --agent claude -p");
  assert.equal(pending["propose --from-brief pagos --agent claude -p"], undefined, "pagos waits");
  const started = b.events.filter((e) => e.type === "started") as Array<{ command: string }>;
  assert.deepEqual(
    started.map((e) => e.command),
    ["specgate propose --from-brief pedidos --agent 'claude -p'"],
  );
  pending["propose --from-brief pedidos --agent claude -p"]!(drafted("pedidos"));
  await until("propose --from-brief pagos --agent claude -p");
  pending["propose --from-brief pagos --agent claude -p"]!(drafted("pagos"));
  const result = await run;
  assert.deepEqual(result, { ok: true, drafted: ["pedidos", "pagos"] });
  // Each draft ends with its notice: what it wrote, and the next step.
  const ends = b.events.filter((e) => e.type === "ended") as Array<
    Extract<CommandEvent, { type: "ended" }>
  >;
  assert.equal(ends.length, 2);
  assert.match(
    ends[0]!.notice!.en.ran,
    /`specgate propose --from-brief pedidos --agent 'claude -p'` had the agent draft pedidos/,
  );
  assert.equal(ends[0]!.notice!.en.wrote, "It wrote `docs/specs/changes/draft-pedidos/`.");
  assert.match(ends[1]!.notice!.es.ran, /pagos/);
});

test("REQ-073: only the modules not drafted yet, in the brief's order; one that fails stops the rest", async () => {
  const b = brief((args) => {
    if (args === "config list") return config("claude -p");
    if (args === "propose --from-brief")
      return modules({
        pedidos: "ready",
        pagos: "not written",
        envios: "not started",
        stock: "archived",
      });
    if (args.startsWith("propose --from-brief pagos"))
      return {
        data: { draft: { module: "pagos", state: "not written" } },
        findings: [],
        exitCode: 1,
      };
    return drafted("envios");
  });
  const result = await b.brief.draft();
  assert.deepEqual(b.calls, [
    "config list",
    "propose --from-brief",
    "propose --from-brief pagos --agent claude -p",
  ]);
  assert.deepEqual(result, { ok: true, drafted: [], stopped: "pagos" });

  const done = brief((args) =>
    args === "config list" ? config("claude -p") : modules({ pedidos: "ready", pagos: "archived" }),
  );
  const nothing = await done.brief.draft();
  assert.equal(nothing.ok, true);
  assert.deepEqual(done.calls, ["config list", "propose --from-brief"]);
  assert.match(
    (nothing as { notice: any }).notice.en.ran,
    /every module of the brief is drafted already/i,
  );
  assert.equal((nothing as { notice: any }).notice.en.wrote, "Nothing was written.");
});

test("REQ-073 SCN-216: pressed again while pedidos drafts — refused with write_busy naming its command; no second draft starts", async () => {
  const pending: Array<(a: SpecgateAnswer) => void> = [];
  const b = brief((args) => {
    if (args === "config list") return config("claude -p");
    if (args === "propose --from-brief") return modules({ pedidos: "not started" });
    return new Promise<SpecgateAnswer>((ok) => pending.push(ok));
  });
  const first = b.brief.draft();
  for (let i = 0; i < 100 && pending.length === 0; i++) await new Promise((ok) => setImmediate(ok));
  const again = await b.brief.draft();
  assert.equal(again.ok, false);
  assert.equal((again as { code: string }).code, "write_busy");
  assert.match((again as { message: string }).message, /specgate propose --from-brief pedidos/);
  assert.match((again as { notice: any }).notice.en.ran, /write_busy/);
  assert.match((again as { notice: any }).notice.en.next, /specgate propose --from-brief pedidos/);
  assert.equal(
    b.calls.filter((c) => c.startsWith("propose --from-brief pedidos")).length,
    1,
    "no second draft",
  );
  pending[0]!(drafted("pedidos"));
  assert.deepEqual(await first, { ok: true, drafted: ["pedidos"] });
});

test("REQ-073 SCN-217: no agent set — nothing runs, the notice names `specgate agents init --tool claude`", async () => {
  const b = brief((args) =>
    args === "config list" ? config() : modules({ pedidos: "not started", pagos: "not started" }),
  );
  const result = await b.brief.draft();
  assert.equal(result.ok, false);
  assert.equal((result as { code: string }).code, "no_agent");
  assert.deepEqual(b.calls, ["config list"], "only the settings were read");
  assert.deepEqual(b.events, [], "nothing ran");
  for (const lang of ["en", "es"] as const) {
    const n: { tone: string; next: string; fix: string } = (
      result as { notice: Record<string, any> }
    ).notice[lang];
    assert.equal(n.tone, "refused");
    assert.equal(n.next, "specgate agents init --tool claude");
    assert.match(n.fix, /specgate agents init --tool claude/);
  }
  assert.match((result as { notice: any }).notice.en.wrote, /Nothing was written/);
});

test("REQ-073: the Brief view's modules and agent, from `propose --from-brief --json` and `config list --json`", async () => {
  const b = brief((args) =>
    args === "config list"
      ? config("claude -p")
      : modules({ pedidos: "ready", pagos: "not started" }),
  );
  assert.deepEqual(await b.brief.view(), {
    agent: "claude -p",
    modules: [
      { module: "pedidos", change: "draft-pedidos", state: "ready", drafted: true },
      { module: "pagos", change: "draft-pagos", state: "not started", drafted: false },
    ],
  });
  assert.deepEqual(b.events, [], "reading the view runs nothing that is told");
});

test('REQ-073: "Draft the modules" explains itself in English and Spanish', () => {
  const en = explain("draft-modules", "en", { module: "pedidos", agent: "claude -p" });
  assert.equal(en.command, "specgate propose --from-brief pedidos --agent 'claude -p'");
  assert.match(en.does, /one at a time/);
  assert.match(en.files, /docs\/specs\/changes\/draft-pedidos\//);
  const es = explain("draft-modules", "es", {});
  assert.equal(es.command, "specgate propose --from-brief <module> --agent <agent>");
  assert.match(es.does, /de uno en uno/);
});
