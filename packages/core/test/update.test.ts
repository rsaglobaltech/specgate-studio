/**
 * draft-desktop — the update's rule (REQ-156): offered on start, installed
 * only once accepted, applied on restart, never during a build or a write.
 * The shell asks the host; the host asks this.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { Commands, updateBlocker, updateStep, type ProcessRunner } from "../src/index.js";

test("REQ-156 SCN-459: an update accepted with nothing running installs, and its notice says from which version, to which, and that a restart applies it", () => {
  const offered = updateStep({ phase: "offered", from: "0.7.0", to: "0.7.1" });
  assert.equal(offered.install, false, "offering installs nothing");
  assert.match(offered.notice.en, /0\.7\.1 is available — you have 0\.7\.0/);
  assert.match(offered.notice.en, /offered again on the next start/);
  assert.match(offered.notice.es, /0\.7\.1 está disponible/);

  const accepted = updateStep({ phase: "accepted", from: "0.7.0", to: "0.7.1", running: null });
  assert.equal(accepted.install, true);

  const installed = updateStep({ phase: "installed", from: "0.7.0", to: "0.7.1" });
  assert.equal(installed.install, false);
  assert.equal(
    installed.notice.en,
    "0.7.1 was installed over 0.7.0. It applies when the studio restarts; until then 0.7.0 keeps running.",
  );
  assert.match(
    installed.notice.es,
    /La 0\.7\.1 se instaló sobre la 0\.7\.0\. Se aplica al reiniciar/,
  );
});

test("REQ-156 SCN-460: no update during a build — accepted while REQ-030 builds, it says it installs once the build ends, and installs nothing", () => {
  const during = updateStep({
    phase: "accepted",
    from: "0.7.0",
    to: "0.7.1",
    running: updateBlocker("REQ-030", null),
  });
  assert.equal(during.install, false);
  assert.equal(
    during.notice.en,
    "The build of REQ-030 is running: the update to 0.7.1 installs once it ends. Nothing is installed meanwhile.",
  );
  assert.match(during.notice.es, /La construcción de REQ-030 está en curso/);
});

test("REQ-156 SCN-460: a write command running holds the update too; with neither, nothing holds it", async () => {
  assert.deepEqual(updateBlocker(null, "specgate apply REQ-030"), {
    command: "specgate apply REQ-030",
  });
  assert.equal(updateBlocker(null, null), null);
  // The build wins over a write when both run: it is what the Developer waits for.
  assert.deepEqual(updateBlocker("REQ-030", "specgate check"), { build: "REQ-030" });

  // Commands says which write runs now, while it runs and not after.
  let release: () => void = () => undefined;
  const runner: ProcessRunner = {
    run: () => new Promise<number>((ok) => (release = () => ok(0))),
  };
  const commands = new Commands(runner);
  assert.equal(commands.writingNow, null);
  const run = commands.run({ name: "apply", req: "REQ-030" });
  await new Promise((r) => setImmediate(r));
  assert.equal(commands.writingNow, "specgate apply REQ-030");
  const held = updateStep({
    phase: "accepted",
    from: "0.7.0",
    to: "0.7.1",
    running: updateBlocker(null, commands.writingNow),
  });
  assert.equal(held.install, false);
  assert.match(held.notice.en, /^`specgate apply REQ-030` is running/);
  release();
  await run;
  assert.equal(commands.writingNow, null);
});

test("REQ-156 SCN-461: an update whose signature does not verify is refused, and nothing is installed", () => {
  const refused = updateStep({ phase: "refused", from: "0.7.0", to: "0.7.1", reason: "signature" });
  assert.equal(refused.install, false);
  assert.equal(
    refused.notice.en,
    "The update to 0.7.1 was refused because its signature did not verify. Nothing was installed; 0.7.0 keeps running.",
  );
  assert.match(refused.notice.es, /se rechazó porque su firma no se verificó/);
  const lost = updateStep({ phase: "refused", from: "0.7.0", to: "0.7.1", reason: "download" });
  assert.equal(lost.install, false);
  assert.match(lost.notice.en, /could not be downloaded/);
});
