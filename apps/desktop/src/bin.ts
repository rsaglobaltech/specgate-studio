#!/usr/bin/env node
import { main } from "./sidecar.js";

main(process.argv.slice(2)).catch((e: unknown) => {
  process.stdout.write(
    JSON.stringify({ type: "error", message: e instanceof Error ? e.message : String(e) }) + "\n",
  );
  process.exit(1);
});
