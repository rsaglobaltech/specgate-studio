/**
 * draft-specgate-port — one contract suite for every adapter (REQ-015): the
 * CLI adapter against a real specgate, the in-memory fake loaded with the CLI
 * adapter's own answers, and an adapter that breaks the contract.
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  InMemorySpecgate,
  SECTIONS,
  SPECGATE_CONTRACT,
  type SpecgatePort,
} from "@specgate-studio/core";
import { SpecgateCli, specgateBin } from "../src/index.js";
import { shop } from "./fixture.js";

const dir = shop();
const cli = new SpecgateCli({
  program: process.execPath,
  prefix: [specgateBin()],
  projectDir: dir,
});

/** The fake, loaded with what the CLI adapter answered on the same project. */
async function recorded(): Promise<InMemorySpecgate> {
  const sections = Object.fromEntries(
    await Promise.all(SECTIONS.map(async (s) => [s, await cli.read(s)] as const)),
  );
  return new InMemorySpecgate({
    version: await cli.version(),
    sections,
    calls: { "apply REQ-001": await cli.call(["apply", "REQ-001"]) },
  });
}

const adapters: Array<[string, () => Promise<SpecgatePort>]> = [
  ["the CLI adapter", async () => cli],
  ["the in-memory fake", recorded],
];

for (const [name, make] of adapters) {
  for (const check of SPECGATE_CONTRACT) {
    test(`REQ-015: ${name} — ${check.name}`, async () => {
      await check.run(await make());
    });
  }
}

test("REQ-015 SCN-039: the same Questions from the CLI adapter and the fake loaded with its answers", async () => {
  const fake = await recorded();
  assert.deepEqual(await fake.read("questions"), await cli.read("questions"));
});

test("REQ-015 SCN-040: an adapter whose questions name nothing they block fails `questions lists what each question blocks`", async () => {
  const fake = await recorded();
  const broken: SpecgatePort = {
    version: () => fake.version(),
    call: (a) => fake.call(a),
    read: async (s) => {
      const data = (await fake.read(s)) as { questions?: { open: object[] } };
      if (s !== "questions" || !data.questions) return data;
      return {
        questions: {
          ...data.questions,
          open: data.questions.open.map((q) => ({ ...q, blocks: [] })),
        },
      };
    },
  };
  const check = SPECGATE_CONTRACT.find(
    (c) => c.name === "questions lists what each question blocks",
  );
  assert.ok(check, "the contract names the check");
  await assert.rejects(check.run(broken));
});

test.after(() => fs.rmSync(path.dirname(dir), { recursive: true, force: true }));
