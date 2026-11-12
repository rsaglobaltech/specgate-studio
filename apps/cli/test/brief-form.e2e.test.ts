/**
 * The brief as a form in a real browser (draft-brief REQ-071, REQ-074), as
 * the board "IDE · Brief" draws it, on fakes: specgate's answers recorded —
 * `propose --from-brief --form --json` reads the form, `--form <file>` writes
 * it as specgate would (only the line that changed), and the client's text
 * is proposed by a recorded answer, never a real agent. The real specgate's
 * byte-for-byte write is tested in packages/host/test/brief-form-real.test.ts.
 */
import test from "node:test";
import assert from "node:assert/strict";
import type { SpecgateAnswer } from "@specgate-studio/core";
import { close, open, untilTerm, type Page } from "./support.js";
import { sprich } from "./sprich.js";

const BRIEF = `---
product: Sprich — orders for a small shop
actors:
  - { name: Customer, surfaces: [web] }
modules: [pedidos, pagos]
---

# Sprich

## Module: pedidos

Rules
- Orders are kept a year.

Examples
- The one where Ana orders two books.

## Module: pagos

Rules
- When the card is expired, the payment is refused.

## Notes from the call with the client

They want it before summer.
`;

/** docs/brief.md read as specgate's form does: each module's rules from its section. */
function formOf(md: string) {
  const modules = ["pedidos", "pagos"].map((key) => {
    const section = md.split(`## Module: ${key}`)[1]?.split("\n## ")[0] ?? "";
    const list = (head: string) => {
      const part = section.split(`${head}\n`)[1]?.split("\n\n")[0] ?? "";
      return part
        .split("\n")
        .filter((l) => l.startsWith("- "))
        .map((l) => ({ text: l.slice(2), line: 0 }));
    };
    return {
      key,
      listed: true,
      name: key,
      section: "module",
      line: 0,
      prose: { text: "", line: null },
      rules: list("Rules"),
      examples: list("Examples"),
      questions: [],
    };
  });
  return {
    form: {
      brief: "docs/brief.md",
      exists: true,
      eol: "lf",
      frontMatter: {
        line: 1,
        product: { value: "Sprich — orders for a small shop", line: 2 },
        surfaces: { value: ["web"], line: null },
        actors: { value: [{ name: "Customer", surfaces: ["web"], line: 4 }], line: 3 },
        modules: { value: ["pedidos", "pagos"], line: 5 },
      },
      modules,
    },
  };
}

function withForm(extra: Record<string, unknown> = {}) {
  const scratch = new Map<string, string>();
  const read = (_: unknown, disk: Record<string, string>): SpecgateAnswer => ({
    data: formOf(disk["docs/brief.md"]!),
    findings: [],
    exitCode: 0,
  });
  // As specgate writes the form: only the first rule of pedidos changes here.
  const write = (_: unknown, disk: Record<string, string>): SpecgateAnswer => {
    const input = JSON.parse(scratch.get("/scratch/brief-form.json")!) as {
      modules: Array<{ key: string; rules: string[] }>;
    };
    const rule = input.modules.find((m) => m.key === "pedidos")!.rules[0]!;
    disk["docs/brief.md"] = disk["docs/brief.md"]!.replace(
      "- Orders are kept a year.",
      `- ${rule}`,
    );
    const back = formOf(disk["docs/brief.md"]!);
    return { data: { form: { ...back.form, written: true } }, findings: [], exitCode: 0 };
  };
  return {
    scratch,
    s: sprich({
      files: { "docs/brief.md": BRIEF, "spec.md": "# spec\n" },
      scratch,
      specgate: {
        "propose --from-brief --form": read,
        "propose --from-brief --form /scratch/brief-form.json": write,
        "propose --from-brief --check --brief docs/brief.md": {
          data: { draft: {} },
          findings: [],
          exitCode: 0,
        },
        ...extra,
      } as never,
    }),
  };
}

async function briefView(page: Page) {
  await page.click('.sga[data-view="brief"]');
  await page.waitForSelector('[data-testid="brief-form"] #brief-product');
}

test("REQ-071 SCN-211: on the desktop, the first rule of pedidos changed in the form and saved — docs/brief.md has the new rule, the notes of the call and every other line unchanged", async () => {
  const { s: made } = withForm();
  const s = await made;
  const page = await open(s);
  try {
    await briefView(page);
    assert.equal(await page.inputValue("#brief-product"), "Sprich — orders for a small shop");
    assert.equal(
      await page.getAttribute(
        '[data-testid="brief-modules"] [data-module="pedidos"]',
        "aria-pressed",
      ),
      "true",
    );
    assert.equal(await page.inputValue("#brief-rules"), "Orders are kept a year.");
    await page.fill("#brief-rules", "Orders are cancelled until 24 h before shipping.");
    await page.click('[data-action="brief-form-save"]');
    await page.waitForSelector('.notice[data-tone="ok"] >> text=wrote the form into docs/brief.md');
    assert.equal(
      s.disk["docs/brief.md"],
      BRIEF.replace(
        "- Orders are kept a year.",
        "- Orders are cancelled until 24 h before shipping.",
      ),
    );
    assert.deepEqual(s.writes, [], "written by specgate, never by the studio");
    await untilTerm(
      page,
      "specgate",
      /specgate propose --from-brief --form \/scratch\/brief-form\.json/,
    );
  } finally {
    await close(s, page);
  }
});

test("REQ-071 SCN-212: in the browser, a rule added to pagos as markdown and saved — the form lists it under pagos, read from the same file", async () => {
  const { s: made } = withForm();
  const s = await made;
  const page = await open(s);
  try {
    await briefView(page);
    await page.click('[data-testid="brief-modules"] [data-module="pagos"]');
    assert.equal(
      await page.inputValue("#brief-rules"),
      "When the card is expired, the payment is refused.",
    );
    // Saved as markdown, through the editor's save (REQ-045): the brief's checks run, the form reads again.
    await page.evaluate(
      (text) => (window as any).__studio.rpc.ask("file.write", { path: "docs/brief.md", text }),
      BRIEF.replace(
        "- When the card is expired, the payment is refused.\n",
        "- When the card is expired, the payment is refused.\n- A refund goes back to the card.\n",
      ),
    );
    await page.waitForFunction(() =>
      (document.querySelector("#brief-rules") as HTMLTextAreaElement | null)?.value.includes(
        "A refund goes back",
      ),
    );
    assert.equal(
      await page.inputValue("#brief-rules"),
      "When the card is expired, the payment is refused.\nA refund goes back to the card.",
    );
  } finally {
    await close(s, page);
  }
});

const CLIENT = "Call with the client.\nThe Customer cancels orders until 24 h before shipping.\n";
const PROPOSED = {
  form: {
    brief: "/scratch/client-brief.md",
    exists: true,
    eol: "lf",
    frontMatter: {
      line: 1,
      product: { value: "Sprich orders and returns", line: 2 },
      surfaces: { value: ["web"], line: 3 },
      actors: { value: [{ name: "Customer", surfaces: ["web"], line: 5 }], line: 4 },
      modules: { value: ["pedidos", "devoluciones"], line: 6 },
    },
    modules: [
      {
        key: "pedidos",
        listed: true,
        name: "pedidos",
        section: "module",
        line: 9,
        prose: { text: "", line: null },
        rules: [{ text: "Orders are cancelled until 24 h before shipping.", line: 11 }],
        examples: [{ text: "The one where Ana cancels 30 h before.", line: 14 }],
        questions: [],
      },
      {
        key: "devoluciones",
        listed: true,
        name: "devoluciones",
        section: "module",
        line: 16,
        prose: { text: "", line: null },
        rules: [{ text: "A return is accepted within 14 days.", line: 18 }],
        examples: [{ text: "The one where Ana returns a book on day 10.", line: 21 }],
        questions: [],
      },
    ],
  },
};

function withProposal() {
  const made = withForm({
    "propose --from-brief --brief /scratch/client-brief.md --agent claude -p": {
      data: { draft: null, form: PROPOSED.form },
      findings: [],
      exitCode: 0,
    },
  });
  return made;
}

async function propose(page: Page) {
  await briefView(page);
  await page.click('[data-action="brief-paste"]');
  await page.fill("#brief-client", CLIENT);
  await page.click('[data-action="brief-propose"]');
  await page.waitForSelector('[data-testid="brief-proposal"]');
}

test('REQ-074 SCN-218: on the desktop, the client\'s text pasted into "Paste the client\'s text", the proposed form reviewed, "Accept" — docs/brief.md has it; before Accept the file had not changed', async () => {
  const { s: made, scratch } = withProposal();
  const s = await made;
  // Accepting writes the proposal as a save of the form: specgate's answer for it, recorded.
  const page = await open(s);
  try {
    await propose(page);
    assert.equal(scratch.get("/scratch/client-brief.md"), CLIENT, "the text, outside the project");
    assert.equal(s.disk["docs/brief.md"], BRIEF, "nothing written before Accept");
    assert.deepEqual(
      await page.$$eval('[data-testid="proposal-modules"] [data-module]', (els) =>
        els.map((e) => e.textContent),
      ),
      ["pedidos", "devoluciones"],
    );
    await page.click('[data-action="brief-accept"]');
    await page.waitForSelector('.notice[data-tone="ok"] >> text=wrote the form into docs/brief.md');
    const written = JSON.parse(scratch.get("/scratch/brief-form.json")!) as {
      frontMatter: { product: string };
      modules: Array<{ key: string; rules: string[]; examples: string[] }>;
    };
    assert.equal(written.frontMatter.product, "Sprich orders and returns");
    assert.deepEqual(
      written.modules.map((m) => [m.key, m.rules, m.examples]),
      [
        [
          "pedidos",
          ["Orders are cancelled until 24 h before shipping."],
          ["The one where Ana cancels 30 h before."],
        ],
        [
          "devoluciones",
          ["A return is accepted within 14 days."],
          ["The one where Ana returns a book on day 10."],
        ],
      ],
    );
    assert.notEqual(s.disk["docs/brief.md"], BRIEF, "written once accepted");
  } finally {
    await close(s, page);
  }
});

test('REQ-074 SCN-219: in the browser, the proposed form shown, "Discard" — docs/brief.md unchanged byte for byte, no file of sprich written', async () => {
  const { s: made } = withProposal();
  const s = await made;
  const page = await open(s);
  try {
    await propose(page);
    await page.click('[data-action="brief-discard"]');
    await page.waitForSelector('[data-testid="brief-proposal"]', { state: "detached" });
    await page.waitForSelector('.notice[data-tone="ok"] >> text=docs/brief.md is as it was');
    assert.equal(s.disk["docs/brief.md"], BRIEF);
    assert.deepEqual(s.writes, []);
    assert.ok(
      !s.calls.some((c) => c.join(" ") === "propose --from-brief --form /scratch/brief-form.json"),
    );
  } finally {
    await close(s, page);
  }
});
