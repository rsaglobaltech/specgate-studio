import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  shellFor,
  type Finding,
  type ProcessRunner,
  type SectionReader,
  type SpecgatePort,
} from "@specgate-studio/core";
import {
  NodeProcessRunner,
  startHost,
  startProjectHost,
  type Host,
  type ProjectFiles,
  type TerminalWiring,
  type WorkspaceWiring,
} from "@specgate-studio/host";
import { NodePty, hasProgram } from "@specgate-studio/adapter-pty-node";
import { SpecgateCli, specgateBin } from "@specgate-studio/adapter-specgate-cli";
import { inProcessSpecgate } from "@specgate-studio/adapter-specgate-api";
import { nodeFiles } from "./nodeFiles.js";

/** The UI bundle built by apps/ui. */
export const UI_DIST = fileURLToPath(new URL("../../../ui/dist", import.meta.url));

export interface ServeOptions {
  projectDir: string;
  /** 4180 by default (draft-core-host A2); 0 picks a free one. */
  port?: number;
  ui?: string;
  /** Fakes for tests; given any of them, the host runs on fakes alone. */
  reader?: SectionReader;
  runner?: ProcessRunner;
  files?: ProjectFiles;
  findings?: () => Promise<Finding[]>;
  workspace?: WorkspaceWiring;
  /** specgate's `--json` answers for the Changes view (draft-changes). */
  specgate?: Pick<SpecgatePort, "call">;
  /** The Developer's terminals; the real pty and their shell when not given. */
  terminals?: TerminalWiring;
}

/**
 * `specgate-studio serve`: the project's core host, serving the UI and its
 * JSON-RPC on 127.0.0.1 — the only place adapters are wired (ADR-0001 rule
 * 5): the open folder through the Node adapters (draft-workspace), specgate
 * in process where its API answers and through the CLI otherwise.
 */
export async function serve(options: ServeOptions): Promise<Host> {
  const projectDir = path.resolve(options.projectDir);
  const ui = options.ui ?? UI_DIST;
  const port = options.port ?? 4180;
  // The Developer's shell in a real pty (draft-terminal A1, A10).
  const terminals = options.terminals ?? {
    pty: new NodePty(),
    shell: shellFor(process.platform, process.env, hasProgram),
  };
  const cliFor = (dir: string) =>
    new SpecgateCli({ program: process.execPath, prefix: [specgateBin()], projectDir: dir });
  if (options.reader || options.runner || options.files || options.workspace) {
    return startHost({
      projectDir,
      reader: options.reader ?? cliFor(projectDir),
      runner:
        options.runner ??
        new NodeProcessRunner({ program: process.execPath, prefix: [specgateBin()], projectDir }),
      files: options.files ?? nodeFiles(projectDir),
      ...(options.findings ? { findings: options.findings } : {}),
      ...(options.workspace ? { workspace: options.workspace } : {}),
      ...(options.specgate ? { changes: { specgate: options.specgate } } : {}),
      terminals,
      port,
      ui,
    });
  }
  return startProjectHost(projectDir, {
    port,
    ui,
    terminals,
    reader: async (dir) => (await inProcessSpecgate(cliFor(dir), dir)) ?? cliFor(dir),
    files: nodeFiles,
    // The specification's findings with file and line, for the editor (REQ-043): read-only.
    findings: (dir) => async () => (await cliFor(dir).call(["validate", "--strict"])).findings,
  });
}
