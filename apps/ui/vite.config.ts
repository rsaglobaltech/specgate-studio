import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// The UI bundle the host serves (ADR-0002 budgets: small, no external fonts or CDNs).
export default defineConfig({
  plugins: [preact()],
  build: { outDir: "dist", emptyOutDir: true, target: "es2022", sourcemap: true },
});
