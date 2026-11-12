/**
 * draft-changes on specgate 0.34: a draft's requests for change read from
 * `change show --json` (REQ-082), each requirement's words before and after a
 * redraft marked (SCN-244), and "Draft again" only with open requests and an
 * agent — the open count handed to its notice (REQ-083).
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  Changes,
  Commands,
  commandLine,
  fromWire,
  reviewOf,
  wordDiff,
  type SpecgateAnswer,
} from "../src/index.js";

const show = (notes: unknown[]) => ({
  change: {
    id: "draft-pedidos",
    config: { brief: "docs/brief.md" },
    review: { file: "docs/specs/changes/draft-pedidos/review.md", open: 1, notes },
  },
});

test("REQ-082 SCN-244: the words a redraft changed are marked on each side; the rest is kept as it was", () => {
  const d = wordDiff(
    "The system SHALL make shipping free for orders of 60 € or more.",
    "The system SHALL make shipping free for orders of 50 € or more.",
  );
  assert.deepEqual(
    d.before.filter((s) => s.changed).map((s) => s.text),
    ["60"],
  );
  assert.deepEqual(
    d.after.filter((s) => s.changed).map((s) => s.text),
    ["50"],
  );
  assert.equal(
    d.before.map((s) => s.text).join(""),
    "The system SHALL make shipping free for orders of 60 € or more.",
  );
  const added = wordDiff("", "A new requirement.");
  assert.deepEqual(added.after, [{ text: "A new requirement.", changed: true }]);
});

test("REQ-082 SCN-243: the review of `change show --json` — open and addressed, with what changed", () => {
  const r = reviewOf(
    show([
      {
        id: "N1",
        date: "2026-11-12",
        requirement: "REQ-031",
        text: "Cancel 24 h before",
        state: "open",
        addressed: null,
        line: 7,
      },
      {
        id: "N2",
        date: "2026-11-12",
        requirement: "REQ-034",
        text: "From 50 €",
        state: "addressed",
        addressed: {
          date: "2026-11-12",
          changes: [
            {
              requirement: "REQ-034",
              file: "docs\\specs\\x.md",
              line: 4,
              before: "60 €",
              after: "50 €",
            },
          ],
        },
        line: 8,
      },
    ]),
  )!;
  assert.equal(r.open, 1);
  assert.deepEqual(
    r.notes.map((n) => [n.id, n.state, n.requirement]),
    [
      ["N1", "open", "REQ-031"],
      ["N2", "addressed", "REQ-034"],
    ],
  );
  assert.equal(r.notes[1]!.changes[0]!.file, "docs/specs/x.md");
  assert.equal(reviewOf({ change: { id: "x" } }), null, "specgate before 0.34 says none");
});

test("REQ-083: redraft is the module's draft with the agent, never sent over the wire; nothing runs with no open request", async () => {
  assert.deepEqual(
    commandLine({ name: "redraft", module: "pedidos", agent: "claude -p", open: 2 })!.args,
    ["propose", "--from-brief", "pedidos", "--agent", "claude -p"],
  );
  assert.equal(fromWire({ name: "redraft", module: "pedidos", agent: "rm", open: 1 }), false);
  const ran: string[] = [];
  const specgate = {
    call: async (args: readonly string[]): Promise<SpecgateAnswer> => {
      if (args[0] === "change")
        return {
          data: show([
            {
              id: "N1",
              date: "d",
              requirement: null,
              text: "t",
              state: "addressed",
              addressed: { date: "d", changes: [] },
              line: 7,
            },
          ]),
          findings: [],
          exitCode: 0,
        };
      return { data: { config: { agent: "claude -p" } }, findings: [], exitCode: 0 };
    },
  };
  const commands = new Commands(
    { run: async (args) => (ran.push(args.join(" ")), 0) },
    {
      json: { call: async (a) => (ran.push(a.join(" ")), { data: {}, findings: [], exitCode: 0 }) },
    },
  );
  const changes = new Changes(specgate, { section: async () => null }, commands);
  const r = await changes.redraft("draft-pedidos");
  assert.ok(!r.ok && r.code === "no_open_request");
  assert.deepEqual(ran, []);
});
