/**
 * The Node adapter of ProcessRunner: specgate spawned with an argument array,
 * never a shell (REQ-007), its output streamed (REQ-005).
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Commands } from "@specgate-studio/core";
import { NodeProcessRunner } from "../src/index.js";

/** A stand-in for specgate: writes the argv it got to argv.json, prints two lines, exits 0. */
function fakeSpecgate(dir: string): string {
  const file = path.join(dir, "fake-specgate.cjs");
  fs.writeFileSync(
    file,
    [
      'const fs = require("node:fs");',
      'const path = require("node:path");',
      'fs.writeFileSync(path.join(__dirname, "argv.json"), JSON.stringify(process.argv.slice(2)));',
      'process.stdout.write("✔ first\\n");',
      'setTimeout(() => { process.stdout.write("✔ second\\n"); process.exit(0); }, 30);',
    ].join("\n")
  );
  return file;
}

function project(name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), name));
  fs.writeFileSync(path.join(dir, "keep.txt"), "still here");
  return dir;
}

test("REQ-007 SCN-013: `add-coupons; rm -rf .` reaches specgate as one argument; no shell runs, nothing removed", async () => {
  const dir = project("sg-host-");
  try {
    const runner = new NodeProcessRunner({
      program: process.execPath,
      prefix: [fakeSpecgate(dir)],
      projectDir: dir,
    });
    const result = await new Commands(runner).run({
      name: "change-validate",
      change: "add-coupons; rm -rf .",
    });
    assert.equal(result.ok && result.exitCode, 0);
    const argv = JSON.parse(fs.readFileSync(path.join(dir, "argv.json"), "utf8"));
    assert.deepEqual(argv, ["change", "validate", "add-coupons; rm -rf .", "--project-dir", dir]);
    assert.equal(fs.readFileSync(path.join(dir, "keep.txt"), "utf8"), "still here");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("REQ-007 SCN-014: a project path with a space reaches Check as one argument, and Check runs in that folder", async () => {
  const dir = project("sg host with space ");
  try {
    const runner = new NodeProcessRunner({
      program: process.execPath,
      prefix: [fakeSpecgate(dir)],
      projectDir: dir,
    });
    const chunks: string[] = [];
    const exit = await runner.run(["check"], (c) => chunks.push(c));
    assert.equal(exit, 0);
    // `specgate check [dir]` takes the folder as its one positional argument.
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, "argv.json"), "utf8")), [
      "check",
      dir,
    ]);
    assert.equal(chunks.join(""), "✔ first\n✔ second\n");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("REQ-005: output reaches the listener as it is written, before the command ends", async () => {
  const dir = project("sg-host-");
  try {
    const runner = new NodeProcessRunner({
      program: process.execPath,
      prefix: [fakeSpecgate(dir)],
      projectDir: dir,
    });
    let firstAt = 0;
    const start = Date.now();
    await runner.run(["status"], () => (firstAt ||= Date.now() - start));
    const total = Date.now() - start;
    assert.ok(firstAt < total, `first chunk at ${firstAt} ms, end at ${total} ms`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
