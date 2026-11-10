#!/usr/bin/env node
import { serve } from "./serve.js";

const USAGE = "Usage: specgate-studio serve [--project-dir <path>] [--port <n>]\n";

async function main(argv: string[]): Promise<void> {
  const [command, ...rest] = argv;
  if (command !== "serve") {
    process.stdout.write(USAGE);
    process.exit(command === "--help" || command === "-h" ? 0 : 2);
  }
  let projectDir = process.cwd();
  let port = 4180;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--project-dir") projectDir = rest[++i] ?? projectDir;
    else if (rest[i] === "--port") port = Number(rest[++i]);
    else {
      process.stderr.write(`unknown argument ${rest[i]}\n${USAGE}`);
      process.exit(2);
    }
  }
  const host = await serve({ projectDir, port });
  const url = host.url.replace(/^ws/, "http");
  process.stdout.write(`specgate studio serving ${projectDir}\n  ${url}\n`);
  const stop = () => void host.close().then(() => process.exit(0));
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

void main(process.argv.slice(2));
