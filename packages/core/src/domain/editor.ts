import type { Finding } from "./finding.js";

/**
 * What the editor shows over a specification file (draft-editor), worked out
 * here so the UI only paints it: where the requirements are (REQ-042), what
 * to underline (REQ-043), which questions to show under which requirement
 * (REQ-044). Lines and columns are 1-based, as editors count them.
 */

export interface Heading {
  req: string;
  line: number;
}

const HEADING = /^###\s+Requirement:\s+(REQ-\d+)\b/;

/** Every `### Requirement:` heading of a file, with its line (REQ-042). */
export function requirementHeadings(text: string): Heading[] {
  const out: Heading[] = [];
  text.split(/\r?\n/).forEach((l, i) => {
    const m = HEADING.exec(l);
    if (m) out.push({ req: m[1]!, line: i + 1 });
  });
  return out;
}

/**
 * The options a question's `questions.md` lists for it, in its "Options seen"
 * column, split on `;` (REQ-044). specgate's `questions --json` does not carry
 * them yet.
 */
export function questionOptions(questionsMd: string, id: string): string[] {
  for (const line of questionsMd.split(/\r?\n/)) {
    const cells = line.split("|").map((c) => c.trim());
    if (cells[1] !== id) continue;
    const options = cells[cells.length - 2] ?? "";
    return options
      .split(";")
      .map((o) => o.trim())
      .filter(Boolean);
  }
  return [];
}

export interface OpenQuestion {
  id: string;
  change: string;
  text: string;
  blocks: string[];
  options: string[];
}

export interface Mark {
  line: number;
  startColumn: number;
  endColumn: number;
  severity: Finding["severity"];
  code: string;
  message: string;
  fix?: string;
}

export interface InlineQuestion {
  id: string;
  change: string;
  text: string;
  options: string[];
  req: string;
  /** The heading's line: the question shows under it. */
  afterLine: number;
}

export interface Annotations {
  /** Where the actions go: each requirement's heading (REQ-042). */
  headings: Heading[];
  marks: Mark[];
  questions: InlineQuestion[];
  /** The open change the file belongs to, for Ask for a change; null outside one. */
  change: string | null;
}

/** The change a file of `docs/specs/changes/<change>/` belongs to; null for any other file. */
export function changeOf(path: string): string | null {
  const m = /^docs\/specs\/changes\/([^/]+)\//.exec(path);
  return m && m[1] !== "archive" ? m[1]! : null;
}

/** The lines of a requirement's section: from its heading to the next heading. */
function section(lines: string[], headings: Heading[], at: number): [number, number] {
  const start = headings[at]!.line;
  const end = (headings[at + 1]?.line ?? lines.length + 1) - 1;
  return [start, end];
}

/**
 * The underlines and inline questions of a file: each finding of the gate at
 * its line (REQ-043 SCN-126), each open question at the words of the
 * requirement it blocks — one of its options, or else the heading (A7) — and
 * shown under that requirement with its options (REQ-044).
 */
export function annotate(input: {
  path: string;
  text: string;
  findings: Finding[];
  questions: OpenQuestion[];
}): Annotations {
  const lines = input.text.split(/\r?\n/);
  const headings = requirementHeadings(input.text);
  const marks: Mark[] = [];
  for (const f of input.findings) {
    if (f.file !== input.path || !f.line || f.line > lines.length) continue;
    marks.push({
      line: f.line,
      startColumn: 1,
      endColumn: lines[f.line - 1]!.length + 1,
      severity: f.severity,
      code: f.code,
      message: f.message,
      ...(f.fix ? { fix: f.fix } : {}),
    });
  }
  const questions: InlineQuestion[] = [];
  headings.forEach((h, at) => {
    for (const q of input.questions) {
      if (!q.blocks.includes(h.req)) continue;
      questions.push({
        id: q.id,
        change: q.change,
        text: q.text,
        options: q.options,
        req: h.req,
        afterLine: h.line,
      });
      const [start, end] = section(lines, headings, at);
      let where: { line: number; from: number; to: number } | null = null;
      for (let n = start; n <= end && !where; n++) {
        const lower = lines[n - 1]!.toLowerCase();
        for (const o of q.options) {
          const i = lower.indexOf(o.toLowerCase());
          if (o && i >= 0) {
            where = { line: n, from: i + 1, to: i + 1 + o.length };
            break;
          }
        }
      }
      where ??= { line: h.line, from: 1, to: lines[h.line - 1]!.length + 1 };
      marks.push({
        line: where.line,
        startColumn: where.from,
        endColumn: where.to,
        severity: "warning",
        code: "question_open",
        message: `${q.id} is open: ${q.text}`,
        fix: `specgate answer ${q.id} "…" --change ${q.change}`,
      });
    }
  });
  marks.sort((a, b) => a.line - b.line || a.startColumn - b.startColumn);
  return { headings, marks, questions, change: changeOf(input.path) };
}
