import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { Finding, ProcessRunner, SectionReader } from "@specgate-studio/core";
import { NodeProcessRunner, startHost, type Host, type ProjectFiles } from "@specgate-studio/host";
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
  /** Fakes for tests; the real adapters otherwise. */
  reader?: SectionReader;
  runner?: ProcessRunner;
  files?: ProjectFiles;
  findings?: () => Promise<Finding[]>;
}

/**
 * `specgate-studio serve`: one core host for the project, serving the UI and
 * its JSON-RPC on 127.0.0.1 — the only place adapters are wired (ADR-0001 rule 5).
 */
export async function serve(options: ServeOptions): Promise<Host> {
  const projectDir = path.resolve(options.projectDir);
  const program = process.execPath;
  const prefix = [specgateBin()];
  const cli = new SpecgateCli({ program, prefix, projectDir });
  const reader = options.reader ?? (await inProcessSpecgate(cli, projectDir)) ?? cli;
  // The specification's findings with file and line, for the editor (REQ-043): read-only.
  const findings =
    options.findings ?? (async () => (await cli.call(["validate", "--strict"])).findings);
  return startHost({
    projectDir,
    reader,
    runner: options.runner ?? new NodeProcessRunner({ program, prefix, projectDir }),
    files: options.files ?? nodeFiles(projectDir),
    findings,
    port: options.port ?? 4180,
    ui: options.ui ?? UI_DIST,
  });
}
