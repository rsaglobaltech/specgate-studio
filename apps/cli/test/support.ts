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
  InMemoryFileSystem,
  InMemoryGit,
  type Finding,
  type ProcessRunner,
  type Section,
  type SectionReader,
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
}

export async function studio(opts: StudioOptions = {}) {
  const reads: Section[] = [];
  const rows = opts.rows ?? 14;
  const data: Record<Section, unknown> = {
    home: {
      total: rows,
      pending: 1,
      requirements: requirements(rows),
      nextCommand: opts.next ?? "specgate apply REQ-000",
    },
    changes: { changes: [{ id: "draft-pedidos" }] },
    questions: {
      questions: {
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
  };
  const reader: SectionReader = {
    read: async (s) => (reads.push(s), structuredClone(data[s])),
  };
  const runs: string[][] = [];
  const runner: ProcessRunner = {
    run: async (args, onOutput) => {
      runs.push([...args]);
      // specgate answer: the question is answered, so it is no longer open.
      if (args[0] === "answer") {
        const q = data.questions as { questions: { open: Array<{ id: string }> } };
        q.questions.open = q.questions.open.filter((x) => x.id !== args[1]);
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
  const git = new InMemoryGit({ [projectDir]: { branch: opts.branch ?? null, uncommitted: [] } });
  const workspace = {
    fs: new InMemoryFileSystem({
      [path.join(projectDir, "docs/specs/traceability.md")]: "# Matrix\n",
    }),
    git,
  };
  const host = await serve({ projectDir, port: 0, reader, runner, files, findings, workspace });
  return { host, reads, runs, writes, disk, git, url: host.url.replace(/^ws/, "http") };
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
  return page;
}

export async function close(s: { host: Host }, page?: Page) {
  await page?.close();
  await s.host.close();
}
