import type { FolderKind } from "./workspace.js";

/**
 * Setting up a folder (draft-project-setup): an empty one is created with
 * `specgate init` from five answers (REQ-111), one with code is adopted in
 * place after a preview of what adoption writes and saves (REQ-112, REQ-113),
 * and either ends with what is ready (REQ-114) and, after an adoption, the
 * areas it found (REQ-115). Pure functions over what specgate says as JSON.
 */

/** The setup a folder needs (REQ-116): none for a specgate project. */
export type SetupStep = "create" | "adopt";

export function setupStep(kind: FolderKind): SetupStep | null {
  return kind === "empty" ? "create" : kind === "code" ? "adopt" : null;
}

/** What the project is, and the `PROJECT_TYPE` init takes for it (A1). */
export const PROJECT_KINDS = {
  web: "frontend",
  api: "backend",
  mobile: "mobile",
  desktop: "desktop",
} as const;
export type ProjectKind = keyof typeof PROJECT_KINDS;

/** The stacks offered, with the `STACK` and `TESTING` init takes for each. */
export const STACKS = {
  "node-react": { stack: "Node.js, React, TypeScript", testing: "Vitest, Playwright" },
  node: { stack: "Node.js, TypeScript", testing: "node:test" },
  "java-spring": { stack: "Java 21, Spring Boot 3.x", testing: "JUnit 5" },
  python: { stack: "Python 3", testing: "pytest" },
  go: { stack: "Go", testing: "go test" },
} as const;
export type StackId = keyof typeof STACKS;

/** The agents `specgate agents init --tool` wires in, by what the Developer calls them (A8). */
export const AGENT_TOOLS = {
  claude: "Claude Code",
  codex: "Codex",
  gemini: "Gemini CLI",
  cursor: "Cursor",
  copilot: "GitHub Copilot",
  opencode: "OpenCode",
} as const;
export type AgentTool = keyof typeof AGENT_TOOLS;

/** init's architecture profiles; minimal is the one the studio proposes (A2). */
export const ARCHITECTURES = ["minimal", "layered", "tactical-ddd"] as const;
export type Architecture = (typeof ARCHITECTURES)[number];

/** The five answers (REQ-111, A1). */
export interface InitAnswers {
  name: string;
  kind: ProjectKind;
  stack: StackId;
  agent: AgentTool | "none";
  architecture: Architecture;
}

/** A slug init accepts: the folder's name has to be one, as the project lands in it (A3). */
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

const own = (o: object, k: unknown) =>
  typeof k === "string" && Object.prototype.hasOwnProperty.call(o, k);

/** What init would refuse in the answers, said before anything runs; null when nothing. */
export function initProblem(a: InitAnswers, folder: string): string | null {
  if (typeof a?.name !== "string" || !a.name.trim()) return "The project needs a name.";
  if (!own(PROJECT_KINDS, a.kind)) return `No project kind ${JSON.stringify(a.kind)}.`;
  if (!own(STACKS, a.stack)) return `No stack ${JSON.stringify(a.stack)}.`;
  if (a.agent !== "none" && !own(AGENT_TOOLS, a.agent))
    return `No agent ${JSON.stringify(a.agent)}.`;
  if (!ARCHITECTURES.includes(a.architecture))
    return `No architecture ${JSON.stringify(a.architecture)}.`;
  if (!SLUG.test(folder))
    return `The folder's name "${folder}" is the project's slug: lowercase letters, numbers and dashes only. Rename the folder, then open it again.`;
  return null;
}

/** The config init reads: one `KEY: "value"` line each, a JSON string being a YAML one. */
export function initConfig(a: InitAnswers, slug: string): string {
  const type = PROJECT_KINDS[a.kind];
  const stack = STACKS[a.stack];
  const config: Record<string, string> = {
    PROJECT_NAME: a.name.trim(),
    PROJECT_SLUG: slug,
    PROJECT_TYPE: type,
    DOMAIN: "general",
    STACK: stack.stack,
    API_STYLE: type === "backend" ? "REST with DTO boundaries" : "none",
    TESTING: stack.testing,
    ARCHITECTURE: a.architecture,
  };
  return Object.entries(config)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n")
    .concat("\n");
}

/**
 * `specgate init` with a config into `out`. The studio builds it in a folder
 * of its own and moves it into the open one: `--out <parent>` would need
 * `--force`, which deletes the open folder first (A3).
 */
export function initArgs(config: string, out: string, git: boolean): string[] {
  return ["init", "--config", config, "--out", out, "--yes", ...(git ? [] : ["--no-git"])];
}

/** The files `specgate adopt` writes when they are not there yet (A5). */
export const ADOPT_FILES: readonly string[] = [
  "spec.md",
  "AGENTS.md",
  "README.md",
  ".gitattributes",
  "features/adoption/baseline.feature",
  "docs/specs/traceability.md",
  "docs/specs/adr/README.md",
];
/** Written when adoption finds areas in the code (REQ-115, A9). */
export const ADOPTION_AREAS = "docs/specs/adoption.md";
/** The spec gate `specgate ci init` writes, which adoption runs (A7). */
export const CI_GATE = ".github/workflows/spec-gate.yml";
/** Where adoption saves the test command and the agent (REQ-113). */
export const HARNESS_CONFIG = "harness.config.yaml";

/** The agents adoption saves for Build when their CLI is on the PATH (A6, A8). */
export const DETECTED_AGENTS: readonly AgentTool[] = ["claude"];

export interface AdoptPreview {
  /** What adoption writes, none of it there yet. */
  files: string[];
  /** What it saves in `harness.config.yaml`; null for what it leaves unset. */
  settings: { test_cmd: string | null; agent: AgentTool | null };
  /** The test command detected and not saved, as the project has no test yet (SCN-336). */
  noTest: { detected: string | null } | null;
}

/**
 * What adopting the folder writes and saves (REQ-112, REQ-113): the files not
 * there yet; the test command when the project has tests to run, and the
 * agent whose CLI is on the PATH — each unless the project has one already.
 */
export function adoptPreview(i: {
  present: ReadonlySet<string>;
  areas: number;
  testCommand: string | null;
  hasTests: boolean;
  /** The programs found on the PATH. */
  found: readonly string[];
  config: Readonly<Record<string, string>>;
}): AdoptPreview {
  const test_cmd = !i.config.test_cmd && i.testCommand && i.hasTests ? i.testCommand : null;
  const agent = i.config.agent ? null : (DETECTED_AGENTS.find((a) => i.found.includes(a)) ?? null);
  const files = [
    ...ADOPT_FILES,
    ...(i.areas > 0 ? [ADOPTION_AREAS] : []),
    CI_GATE,
    ...(test_cmd || agent ? [HARNESS_CONFIG] : []),
  ].filter((f) => !i.present.has(f));
  return {
    files,
    settings: { test_cmd, agent },
    noTest: !i.config.test_cmd && !test_cmd ? { detected: i.testCommand } : null,
  };
}

const TEST_FILE =
  /(\.|-|_)(test|spec)\.[cm]?[jt]sx?$|Test\.(java|kt)$|_test\.(go|py)$|^test_.*\.py$/;

/**
 * Whether the project has tests to run (A6, specgate's REQ-470): a `test`
 * script other than npm's placeholder, a test file, or a `src/test` folder.
 */
export function hasTests(packageJson: string | null, files: readonly string[]): boolean {
  try {
    const script = (JSON.parse(packageJson ?? "") as { scripts?: Record<string, unknown> }).scripts
      ?.test;
    if (typeof script === "string" && script && !/no test specified/.test(script)) return true;
  } catch {
    // No package.json, or not JSON.
  }
  return files.some(
    (f) => f.startsWith("src/test/") || TEST_FILE.test(f.slice(f.lastIndexOf("/") + 1)),
  );
}

/** The readiness list's items, in its order (REQ-114, A7). */
export type ReadyId = "tests" | "agent" | "architecture" | "ci";

export interface ReadyItem {
  id: ReadyId;
  /** What is set; null when it is not. */
  value: string | null;
}

/** The agent's name from Build's command: Claude Code for `claude …`. */
export function agentLabel(command: string): string {
  const program = (command.trim().split(/\s/)[0] ?? "").replace(/^.*[\\/]/, "");
  return own(AGENT_TOOLS, program) ? AGENT_TOOLS[program as AgentTool] : program;
}

/** What is ready, from `config list --json` and the CI gate's file (REQ-114). */
export function readiness(
  config: Readonly<Record<string, string>>,
  ciFile: string | null,
): ReadyItem[] {
  return [
    { id: "tests", value: config.test_cmd || null },
    { id: "agent", value: config.agent ? agentLabel(config.agent) : null },
    { id: "architecture", value: config.arch_cmd || null },
    { id: "ci", value: ciFile },
  ];
}

/** An area adoption found: its folder and the tests that name it (REQ-115). */
export interface Area {
  title: string;
  folder: string;
  tests: string[];
}

/**
 * The areas of `docs/specs/adoption.md`, as specgate writes them:
 * `## <Title>`, then `- Code: \`<folder>\` · …` and `- Tests: \`<file>\`, … | none found`.
 */
export function adoptionAreas(md: string): Area[] {
  const areas: Area[] = [];
  let area: Area | null = null;
  for (const line of md.split(/\r?\n/)) {
    if (line.startsWith("## ")) {
      area = { title: line.slice(3).trim(), folder: "", tests: [] };
      areas.push(area);
    } else if (area && line.startsWith("- Code:")) {
      area.folder = /`([^`]+)`/.exec(line)?.[1] ?? "";
    } else if (area && line.startsWith("- Tests:")) {
      area.tests = [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1]!);
    }
  }
  return areas;
}
