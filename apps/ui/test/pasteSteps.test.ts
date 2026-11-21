/**
 * The paste dialog's steps without a browser (brief-paste-progress REQ-235):
 * what each step shows while the agent proposes the form, and when specgate
 * refuses.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { agentIn, pasteSteps } from "../src/pasteSteps.js";

const COMMAND =
  "specgate propose --from-brief --brief /tmp/specgate-studio-x/client-brief.md --agent 'claude -p --permission-mode acceptEdits < {prompt_file}'";

test("REQ-235 SCN-1014: under way — the file done, claude proposing with its seconds and command, the form to come", () => {
  const steps = pasteSteps({ state: "busy", seconds: 12, command: COMMAND });
  assert.deepEqual(
    steps.map((s) => [s.key, s.state]),
    [
      ["file", "done"],
      ["agent", "now"],
      ["form", "todo"],
    ],
  );
  assert.equal(steps[1]!.agent, "claude");
  assert.equal(steps[1]!.seconds, 12);
  assert.equal(steps[1]!.command, COMMAND);
});

test("REQ-235 SCN-1014: before specgate's command is known, the agent's step is under way and names no agent", () => {
  const steps = pasteSteps({ state: "busy", seconds: 0, command: null });
  assert.equal(steps[1]!.state, "now");
  assert.equal(steps[1]!.agent, null);
});

test("REQ-235 SCN-1015: refused — the agent's step failed with specgate's message and fix, the form never comes", () => {
  const steps = pasteSteps({
    state: "failed",
    seconds: 40,
    command: COMMAND,
    failure: { message: "The agent wrote no front matter.", fix: "Give it edit permission." },
  });
  assert.deepEqual(
    steps.map((s) => s.state),
    ["done", "failed", "todo"],
  );
  assert.deepEqual(steps[1]!.failure, {
    message: "The agent wrote no front matter.",
    fix: "Give it edit permission.",
  });
});

test("REQ-235: the agent's program read from the command, quoted either way, or none", () => {
  assert.equal(agentIn(COMMAND), "claude");
  assert.equal(agentIn(`specgate propose --from-brief --agent "codex exec"`), "codex");
  assert.equal(agentIn("specgate propose --from-brief --agent /usr/local/bin/claude"), "claude");
  assert.equal(agentIn("specgate status"), null);
  assert.equal(agentIn(null), null);
});
