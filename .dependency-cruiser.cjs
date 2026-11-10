/**
 * ADR-0001 — the hexagonal rules, checked by the gate (`npm run arch`).
 * Paths are the TypeScript sources; tests may use Node and fakes.
 */
module.exports = {
  forbidden: [
    {
      name: "core-imports-nothing-outside-core",
      comment: "Rule 1: packages/core/src depends on nothing — no Node built-ins, no packages.",
      severity: "error",
      from: { path: "^packages/core/src" },
      to: { pathNot: "^packages/core/src" },
    },
    {
      name: "domain-is-innermost",
      comment: "Rule 2: the domain imports nothing from application or ports.",
      severity: "error",
      from: { path: "^packages/core/src/domain" },
      to: { path: "^packages/core/src/(application|ports)" },
    },
    {
      name: "core-never-imports-an-adapter",
      comment: "Rule 3: core never imports host, protocol or an adapter.",
      severity: "error",
      from: { path: "^packages/core" },
      to: { path: "^packages/(?!core/)" },
    },
    {
      name: "protocol-is-types-over-core",
      comment: "Rule 4: protocol imports core types only — the UI imports protocol, never core.",
      severity: "error",
      from: { path: "^packages/protocol/src" },
      to: { pathNot: "^packages/(protocol|core)/src" },
    },
    {
      name: "ui-imports-protocol-only",
      comment:
        "Rule 4: apps/ui is a driving adapter — it calls the host through protocol and imports neither core, host nor an adapter.",
      severity: "error",
      from: { path: "^apps/ui/src" },
      to: { path: "^(packages/(?!protocol/)|apps/(?!ui/))" },
    },
    {
      name: "only-host-and-apps-wire-adapters",
      comment: "Rule 5: an adapter never imports the host; only host and apps wire adapters together.",
      severity: "error",
      from: { path: "^packages/adapter-" },
      to: { path: "^packages/host" },
    },
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(^|/)dist(-test)?/|node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.depcruise.json" },
    enhancedResolveOptions: { extensions: [".ts", ".js"] },
  },
};
