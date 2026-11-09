/**
 * draft-specgate-port — the CLI adapter: specgate run with --json, its output
 * parsed into data and findings (REQ-012), against a real specgate project.
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { SpecgateCli, specgateBin } from "../src/index.js";
import { shop } from "./fixture.js";

const cli = (dir: string) =>
  new SpecgateCli({ program: process.execPath, prefix: [specgateBin()], projectDir: dir });

test("REQ-012 SCN-033: Questions, parsed from `specgate questions --json` — Q2 with what it blocks", async () => {
  const dir = shop();
  try {
    const data = (await cli(dir).read("questions")) as {
      questions: { open: { id: string; change: string; text: string; blocks: string[] }[] };
    };
    const q2 = data.questions.open.find((q) => q.id === "Q2");
    assert.ok(q2, JSON.stringify(data));
    assert.equal(q2.change, "draft-orders");
    assert.equal(q2.text, "Until when can an order be cancelled?");
    assert.deepEqual(q2.blocks, ["REQ-003"]);
  } finally {
    fs.rmSync(path.dirname(dir), { recursive: true, force: true });
  }
});

test("REQ-012 SCN-034: a refused apply returns the finding apply_no_test with its fix, not prose", async () => {
  const dir = shop();
  try {
    const answer = await cli(dir).call(["apply", "REQ-001"]);
    const finding = answer.findings.find((f) => f.code === "apply_no_test");
    assert.ok(finding, JSON.stringify(answer));
    assert.equal(finding.severity, "error");
    assert.equal(finding.target, "REQ-001");
    assert.match(finding.fix ?? "", /write a test that names REQ-001/);
    assert.equal(
      (answer.data as { status?: unknown }).status,
      undefined,
      "findings are not repeated in the data",
    );
  } finally {
    fs.rmSync(path.dirname(dir), { recursive: true, force: true });
  }
});

test("REQ-012: every section reads as data, from the command A4 names", async () => {
  const dir = shop();
  try {
    const port = cli(dir);
    const home = (await port.read("home")) as { total?: number };
    assert.equal(typeof home.total, "number");
    const changes = (await port.read("changes")) as { changes: { id: string }[] };
    assert.ok(changes.changes.some((c) => c.id === "draft-orders"));
    assert.ok(((await port.read("matrix")) as { matrix: unknown }).matrix);
    assert.equal(typeof ((await port.read("report")) as { total?: number }).total, "number");
  } finally {
    fs.rmSync(path.dirname(dir), { recursive: true, force: true });
  }
});

test("REQ-012: output that is not JSON is an error that says the command", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sg-port-"));
  try {
    const fake = path.join(dir, "fake.cjs");
    fs.writeFileSync(fake, 'process.stdout.write("not json\\n");');
    const port = new SpecgateCli({ program: process.execPath, prefix: [fake], projectDir: dir });
    await assert.rejects(port.read("questions"), /specgate questions --json/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
