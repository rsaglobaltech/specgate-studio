/**
 * demo-findings without a browser: the button the studio's terminal names for
 * each run (REQ-053) — a queued build's own, not the button pressed last (REQ-103).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { Echoes } from "../src/echo.js";

const RUN = (req: string) => `specgate harness run --req ${req}`;

test("REQ-103 SCN-633: REQ-142 and REQ-143 queued while REQ-141 builds — each run echoed with its own button", () => {
  const e = new Echoes();
  e.build("REQ-141", "Construir REQ-141");
  assert.equal(e.started(RUN("REQ-141")), "Construir REQ-141");
  e.build("REQ-142", "Construir REQ-142");
  e.build("REQ-143", "Construir REQ-143");
  assert.equal(e.started(RUN("REQ-142")), "Construir REQ-142");
  assert.equal(e.started(RUN("REQ-143")), "Construir REQ-143");
});

test("REQ-103 SCN-633: a build's button is not taken by another command, and a pending button still names the next run", () => {
  const e = new Echoes();
  e.build("REQ-142", "Construir REQ-142");
  e.announce("Aplicar REQ-139");
  assert.equal(e.started("specgate apply REQ-139"), "Aplicar REQ-139");
  // A run nothing named: its command.
  assert.equal(e.started("specgate check"), "specgate check");
  assert.equal(e.started(RUN("REQ-142")), "Construir REQ-142");
  // A build the studio started without a button of its own: its command.
  assert.equal(e.started(RUN("REQ-150")), RUN("REQ-150"));
});

test("REQ-103: a build refused is forgotten — its button names no later run", () => {
  const e = new Echoes();
  e.build("REQ-142", "Construir REQ-142");
  e.forget("REQ-142");
  assert.equal(e.started(RUN("REQ-142")), RUN("REQ-142"));
});
