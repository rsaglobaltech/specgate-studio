import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  AGENT_TOOLS,
  ARCHITECTURES,
  PROJECT_KINDS,
  STACKS,
  Setup,
  initConfig,
  initProblem,
  shown,
  toPosix,
  type Commands,
  type FileSystemPort,
  type InitAnswers,
  type RunResult,
  type SetupPort,
} from "@specgate-studio/core";

/** The ports the setup of a folder reads (draft-project-setup). */
export interface SetupWiring {
  port: SetupPort;
  fs: FileSystemPort;
  /** Whether a program is on the PATH: the agent adoption detects (A8). */
  onPath: (program: string) => boolean;
}

type Handlers = Record<string, (params: unknown) => Promise<unknown>>;

/** The folder holds nothing but, perhaps, its `.git`: a project may be created in it. */
function emptyFolder(dir: string): boolean {
  return fs.readdirSync(dir).every((e) => e === ".git");
}

/**
 * The setup of the open folder in the host (draft-project-setup): its
 * options and the `specgate init` five answers make (REQ-111), creating the
 * project in the folder itself, the adoption's preview (REQ-112, REQ-113),
 * what is ready (REQ-114) and the areas adoption found (REQ-115).
 */
export function attachSetup(
  projectDir: string,
  wiring: SetupWiring,
  commands: Commands,
  files: () => Promise<string[]>,
  invalid: (message: string) => Error,
): { handlers: Handlers } {
  const setup = new Setup({
    root: toPosix(projectDir),
    port: wiring.port,
    fs: wiring.fs,
    files,
    onPath: wiring.onPath,
  });
  const slug = path.basename(projectDir);
  const answers = (params: unknown): InitAnswers => {
    const a = (params ?? {}) as InitAnswers;
    const problem = initProblem(a, slug);
    if (problem) throw invalid(problem);
    return a;
  };
  const plan = (a: InitAnswers) => [
    shown(["init", "--config", `${slug}.yaml`, "--yes"]),
    ...(a.agent !== "none" ? [shown(["agents", "init", "--tool", a.agent])] : []),
  ];

  const handlers: Handlers = {
    "setup.options": async () => ({
      kinds: Object.keys(PROJECT_KINDS),
      stacks: Object.entries(STACKS).map(([id, s]) => ({ id, label: s.stack })),
      agents: Object.entries(AGENT_TOOLS).map(([id, label]) => ({ id, label })),
      architectures: [...ARCHITECTURES],
      name: slug,
    }),
    // What the answers make, before anything runs (SCN-332).
    "setup.plan": async (params) => {
      const a = (params ?? {}) as InitAnswers;
      const problem = initProblem(a, slug);
      return problem
        ? { problem, config: "", commands: [] }
        : { problem: null, config: initConfig(a, slug), commands: plan(a) };
    },
    // `specgate init` in a folder of the studio's, moved into this one: with
    // `--out <parent>` init needs `--force`, which deletes the folder first.
    "setup.create": async (params): Promise<RunResult> => {
      const a = answers(params);
      if (!emptyFolder(projectDir)) throw invalid("The folder is not empty: adopt it instead.");
      const git = !fs.existsSync(path.join(projectDir, ".git"));
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "studio-init-"));
      let result: RunResult;
      try {
        const config = path.join(tmp, `${slug}.yaml`);
        fs.writeFileSync(config, initConfig(a, slug));
        result = await commands.runInit(config, tmp, git);
        const built = path.join(tmp, slug);
        if (result.ok && result.exitCode === 0 && fs.existsSync(built)) {
          for (const e of fs.readdirSync(built)) {
            fs.cpSync(path.join(built, e), path.join(projectDir, e), {
              recursive: true,
              errorOnExist: true,
              force: false,
            });
          }
        }
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
      if (result.ok && result.exitCode === 0 && a.agent !== "none") {
        return commands.run({ name: "agents-init", tool: a.agent });
      }
      return result;
    },
    "setup.preview": () => setup.preview(),
    "setup.readiness": () => setup.readiness(),
    "setup.areas": () => setup.areas(),
  };
  return { handlers };
}
