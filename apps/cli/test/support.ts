/**
 * The browser tests' studio: `specgate-studio serve` with the UI bundle and a
 * host fed by fakes, so no real project is read; Chromium through Playwright.
 */
import { after, before } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import {
  FakeHarness,
  InMemoryHarnessEvents,
  InMemoryFileSystem,
  InMemoryGit,
  type Finding,
  type ProcessRunner,
  type Section,
  type SectionReader,
  type SpecgateAnswer,
} from "@specgate-studio/core";
import type { Host, ProjectFiles } from "@specgate-studio/host";
import { serve, UI_DIST } from "../src/index.js";

export type { Page };
export const MAC = process.platform === "darwin";
export const MOD = MAC ? "Meta" : "Control";
/** The budgets of ADR-0002 are measured on the Linux runner (A12); elsewhere on request. */
export const PERF = process.platform === "linux" || process.env.STUDIO_PERF === "1";

export let browser: Browser;
let dir: string;

before(async () => {
  assert.ok(fs.existsSync(path.join(UI_DIST, "index.html")), "the UI is built: npm run build");
  browser = await chromium.launch();
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "sg-wb-"));
});
after(async () => {
  await browser?.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

export function requirements(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `REQ-${String(i).padStart(3, "0")}`,
    title: `Requirement ${i}`,
    category: i < n - 1 ? "DONE" : "NEEDS_TEST",
    needs: i < n - 1 ? null : "its test",
  }));
}

/** A host for sprich, fed by fakes; counts what it reads. */
export interface StudioOptions {
  rows?: number;
  next?: string;
  /** Files of the project with their text; Explorer's three by default. */
  files?: Record<string, string>;
  /** The gate's findings with file and line (validate --strict). */
  findings?: Finding[];
  /** The project's git branch, read through the workspace (draft-workspace). */
  branch?: string | null;
  /** Sections over the defaults (draft-changes). */
  sections?: Partial<Record<Section, unknown>>;
  /**
   * specgate's `--json` answers, by the arguments joined with spaces; a
   * function may change the sections, as the command would, read the files
   * on disk, or answer later. Every call is recorded in `calls` (draft-changes).
   */
  specgate?: Record<
    string,
    | SpecgateAnswer
    | ((
        data: Record<Section, unknown>,
        disk: Record<string, string>,
      ) => SpecgateAnswer | Promise<SpecgateAnswer>)
  >;
  /** What `specgate questions --json` answers; Q2 of draft-pedidos by default. */
  questions?: { open: unknown[]; answered?: unknown[] };
  /** Home's requirements; `requirements(rows)` by default. */
  homeRequirements?: Array<{ id: string; title: string; category: string; needs: string | null }>;
  /** The project's uncommitted files (draft-build-live); none by default. */
  uncommitted?: string[];
}

export async function studio(opts: StudioOptions = {}) {
  const reads: Section[] = [];
  const rows = opts.rows ?? 14;
  const data: Record<Section, unknown> = {
    home: {
      total: rows,
      pending: 1,
      requirements: opts.homeRequirements ?? requirements(rows),
      nextCommand: opts.next ?? "specgate apply REQ-000",
    },
    changes: { changes: [{ id: "draft-pedidos" }] },
    questions: {
      questions: opts.questions ?? {
        open: [
          {
            id: "Q2",
            change: "draft-pedidos",
            text: "Until when can an order be cancelled?",
            blocks: ["REQ-031"],
          },
        ],
      },
    },
    matrix: { matrix: { derived: true, written: false, rows } },
    report: { total: rows },
    ...opts.sections,
  };
  const reader: SectionReader = {
    read: async (s) => (reads.push(s), structuredClone(data[s])),
  };
  const runs: string[][] = [];
  const runner: ProcessRunner = {
    run: async (args, onOutput) => {
      runs.push([...args]);
      // specgate answer: the question is answered, so it is no longer open;
      // it waits in `answered` until --reviewed, which lifts what it blocked.
      if (args[0] === "answer") {
        type Q = { id: string; blocks: string[]; answer?: string };
        const q = data.questions as { questions: { open: Q[]; answered?: Q[] } };
        const home = data.home as { requirements: Array<{ id: string; category: string }> };
        if (args[2] === "--reviewed") {
          const done = q.questions.answered?.find((x) => x.id === args[1]);
          if (q.questions.answered)
            q.questions.answered = q.questions.answered.filter((x) => x.id !== args[1]);
          for (const r of home.requirements)
            if (done?.blocks.includes(r.id)) r.category = "NEEDS_EVERYTHING";
        } else {
          const asked = q.questions.open.find((x) => x.id === args[1]);
          q.questions.open = q.questions.open.filter((x) => x.id !== args[1]);
          if (asked && q.questions.answered)
            q.questions.answered.push({ ...asked, answer: args[2]! });
        }
      }
      onOutput("✔ Specification\n✔ Tests\n");
      return 0;
    },
  };
  const disk: Record<string, string> = opts.files ?? {
    "docs/brief.md": "# docs/brief.md\n",
    "docs/specs/changes/draft-workbench/proposal.md":
      "# docs/specs/changes/draft-workbench/proposal.md\n",
    "spec.md": "# spec.md\n",
  };
  const writes: string[] = [];
  const files: ProjectFiles = {
    list: async () => Object.keys(disk),
    read: async (p) => {
      if (!(p in disk)) throw new Error(`no ${p}`);
      return disk[p]!;
    },
    write: async (p, text) => {
      writes.push(p);
      disk[p] = text;
    },
  };
  const projectDir = path.join(dir, "sprich");
  fs.mkdirSync(projectDir, { recursive: true });
  const findings = async () => opts.findings ?? [];
  // The open folder in memory: a specgate project on its branch, nothing uncommitted.
  const git = new InMemoryGit({
    [projectDir]: { branch: opts.branch ?? null, uncommitted: [...(opts.uncommitted ?? [])] },
  });
  // Build's harness: a build ends when the test says (draft-build-live).
  const harness = new FakeHarness();
  const events = new InMemoryHarnessEvents();
  const workspace = {
    fs: new InMemoryFileSystem({
      [path.join(projectDir, "docs/specs/traceability.md")]: "# Matrix\n",
    }),
    git,
  };
  const calls: string[][] = [];
  const answers = opts.specgate;
  const specgate = answers && {
    call: async (args: readonly string[]): Promise<SpecgateAnswer> => {
      calls.push([...args]);
      const a = answers[args.join(" ")];
      if (!a) throw new Error(`no answer recorded for specgate ${args.join(" ")}`);
      return structuredClone(typeof a === "function" ? await a(data, disk) : a);
    },
  };
  const host = await serve({
    projectDir,
    port: 0,
    reader,
    runner,
    files,
    findings,
    workspace,
    ...(specgate ? { specgate } : {}),
    builds: { git, harness, events, pollMs: 50 },
  });
  return {
    host,
    reads,
    runs,
    calls,
    writes,
    disk,
    git,
    harness,
    events,
    projectDir,
    url: host.url.replace(/^ws/, "http"),
  };
}

export async function open(
  host: { url: string },
  init?: { lang?: "en" | "es"; theme?: "dark" | "light" },
): Promise<Page> {
  const page = await browser.newPage({ locale: "en-US" });
  if (init?.lang) {
    await page.addInitScript(
      (s) => localStorage.setItem("specgate-studio.settings", JSON.stringify(s)),
      {
        lang: init.lang,
        theme: init.theme ?? "dark",
      },
    );
  }
  await page.goto(host.url);
  await page.waitForSelector("body[data-ready] .activity .sga");
  // Settled: the terminals' chunk too, which asks the host for its terminals once.
  await page.waitForSelector(".term-tabs");
  return page;
}

export async function close(s: { host: Host }, page?: Page) {
  await page?.close();
  await s.host.close();
}

/** What an xterm.js terminal of the page shows, its whole buffer, line by line. */
export function termText(page: Page, id: string): Promise<string> {
  return page.evaluate((tid) => {
    const term = (window as any).__studio.terms?.get(tid);
    if (!term) return "";
    const b = term.buffer.active;
    const lines: string[] = [];
    for (let i = 0; i < b.length; i++) lines.push(b.getLine(i).translateToString(true));
    return lines.join("\n");
  }, id);
}

/** Waits until a terminal shows text matching `re`. */
export async function untilTerm(page: Page, id: string, re: RegExp, ms = 20_000): Promise<string> {
  const start = Date.now();
  for (;;) {
    const text = await termText(page, id);
    if (re.test(text)) return text;
    if (Date.now() - start > ms)
      throw new Error(`terminal ${id}: no ${re} in ${JSON.stringify(text.slice(-400))}`);
    await new Promise((ok) => setTimeout(ok, 50));
  }
}
