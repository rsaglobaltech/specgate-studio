import { SECTIONS } from "../domain/section.js";
import type { SpecgatePort } from "../ports/SpecgatePort.js";

/** One check every SpecgatePort adapter must pass (REQ-015). */
export interface ContractCheck {
  name: string;
  run(port: SpecgatePort): Promise<void>;
}

function must(ok: boolean, why: string): void {
  if (!ok) throw new Error(why);
}

const isObject = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);

/**
 * The contract of SpecgatePort (REQ-015, ADR-0003): run against the CLI
 * adapter, the in-process adapter and the in-memory fake alike. An adapter is
 * used only when it passes every check. Each check needs a project with at
 * least one open question and a requirement no test names (REQ-001).
 */
export const SPECGATE_CONTRACT: ContractCheck[] = [
  {
    name: "version is a release number",
    async run(port) {
      const v = await port.version();
      must(/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(v), `version ${JSON.stringify(v)} is not x.y.z`);
    },
  },
  {
    name: "every section reads as an object",
    async run(port) {
      for (const section of SECTIONS) {
        must(isObject(await port.read(section)), `${section} did not read as an object`);
      }
    },
  },
  {
    name: "questions lists what each question blocks",
    async run(port) {
      const data = await port.read("questions");
      const open = isObject(data) && isObject(data.questions) ? data.questions.open : undefined;
      must(Array.isArray(open) && open.length > 0, "questions has no open list");
      for (const q of open as unknown[]) {
        must(isObject(q), "a question is not an object");
        const { id, change, text, blocks } = q as Record<string, unknown>;
        must(typeof id === "string" && /^Q\d+$/.test(id), `question id ${String(id)}`);
        must(typeof change === "string" && change.length > 0, `${String(id)} names no change`);
        must(typeof text === "string" && text.length > 0, `${String(id)} has no text`);
        must(
          Array.isArray(blocks) &&
            blocks.length > 0 &&
            blocks.every((b) => typeof b === "string" && /^REQ-\d+$/.test(b)),
          `${String(id)} does not say which requirements it blocks`,
        );
      }
    },
  },
  {
    name: "a refused command returns its findings with code and fix",
    async run(port) {
      const answer = await port.call(["apply", "REQ-001"]);
      must(answer.findings.length > 0, "apply REQ-001 returned no finding");
      for (const f of answer.findings) {
        must(typeof f.code === "string" && f.code.length > 0, "a finding has no code");
        must(typeof f.message === "string" && f.message.length > 0, `${f.code} has no message`);
      }
      must(
        answer.findings.some((f) => typeof f.fix === "string" && f.fix.length > 0),
        "no finding says how to fix it",
      );
    },
  },
];
