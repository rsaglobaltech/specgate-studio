#!/usr/bin/env node
import { serve, serveOrJoin } from "./serve.js";

const USAGE = "Usage: specgate-studio serve [--project-dir <path> | --no-folder] [--port <n>]\n";

async function main(argv: string[]): Promise<void> {
  const [command, ...rest] = argv;
  if (command !== "serve") {
    process.stdout.write(USAGE);
    process.exit(command === "--help" || command === "-h" ? 0 : 2);
  }
  let projectDir = process.cwd();
  let port = 4180;
  // Started with no folder open (draft-workbench-v2 REQ-185).
  let noFolder = false;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--project-dir") projectDir = rest[++i] ?? projectDir;
    else if (rest[i] === "--port") port = Number(rest[++i]);
    else if (rest[i] === "--no-folder") noFolder = true;
    else {
      process.stderr.write(`unknown argument ${rest[i]}\n${USAGE}`);
      process.exit(2);
    }
  }
  if (noFolder) {
    // No folder open: nothing to share with another host (draft-workbench-v2 REQ-185).
    const host = await serve({ projectDir, port, noFolder });
    process.stdout.write(
      `specgate studio serving no folder\n  ${host.url.replace(/^ws/, "http")}\n`,
    );
    const stop = () => void host.close().then(() => process.exit(0));
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
    return;
  }
  const served = await serveOrJoin({ projectDir, port });
  if (served.joined) {
    // The desktop app (or another serve) runs this project's host: one host, shared (REQ-158).
    process.stdout.write(
      `specgate studio: ${projectDir} is already open in the studio (process ${served.lock.pid}); open its address:\n  ${served.url}\n`,
    );
    return;
  }
  process.stdout.write(`specgate studio serving ${projectDir}\n  ${served.url}\n`);
  const stop = () => void served.host.close().then(() => process.exit(0));
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

void main(process.argv.slice(2));
