/**
 * The studio's own icon theme (draft-workbench-v2 REQ-187): a folder — closed
 * and open — and a file icon for each kind A12 lists, and a generic one for
 * any other; each drawn as the activity bar's icons are (24 px grid, strokes
 * of 1.8, round caps and joins, no fill — A13) in its kind's accent colour,
 * a design token (A31). Inline SVG paths: nothing is fetched.
 */

export interface FileIcon {
  kind: string;
  /** The design token of its colour, e.g. `--blue`. */
  token: string;
  paths: string[];
}

const FOLDER =
  "M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z";
const FOLDER_OPEN = [
  "M3 17.5v-10A2.5 2.5 0 0 1 5.5 5H9l2 2h6.5A2.5 2.5 0 0 1 20 9.5V11",
  "M3 17.5l2.3-5.4A1.8 1.8 0 0 1 7 11h14l-2.5 7.2a2.5 2.5 0 0 1-2.4 1.8H5.5A2.5 2.5 0 0 1 3 17.5z",
];
const FILE = "M14 3H6.5A2.5 2.5 0 0 0 4 5.5v13A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V9z";
const FOLD = "M14 3v6h6";

/** What sits inside a folder of each kind. */
const FOLDER_MARKS: Record<string, string[]> = {
  docs: ["M8.5 12h7M8.5 15h5"],
  src: ["M10 11.5 8 13.5l2 2M14 11.5l2 2-2 2"],
  test: ["M9 13.5l2 2 4-4"],
  features: ["M12 10.5l2.5 3-2.5 3-2.5-3z"],
  specs: ["M12 10.5l2.5 3-2.5 3-2.5-3z"],
  github: ["M12 11a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"],
  node_modules: ["M12 10.5l3 1.7v3.4l-3 1.7-3-1.7v-3.4z"],
  scripts: ["M8.5 11.5l2 2-2 2M12.5 15.5h3"],
  dist: ["M12 10.5v5M9.8 13.3 12 15.5l2.2-2.2"],
  bin: ["M9 11v5M12 11v5M15 11v5"],
  claude: ["M12 10.5v6M9.4 12l5.2 3M9.4 15l5.2-3"],
  idea: ["M9.5 11h5M12 11v5M9.5 16h5"],
  vscode: ["M14.5 10.5v6l-5-3z"],
  public: ["M12 10.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM9 13.5h6"],
  assets: ["M8.5 16l2.5-3 2 2 1.5-1.5 1.5 2.5"],
  components: ["M9 11h2.5v2.5H9zM12.5 13.5H15V16h-2.5z"],
  lib: ["M9 11v5M11.5 11v5M14 11l1.5 5"],
  packages: ["M12 10.5l3 1.5v3l-3 1.5-3-1.5v-3zM9 12l3 1.5 3-1.5"],
  apps: ["M9 11h2v2H9zM13 11h2v2h-2zM9 14.5h2v2H9zM13 14.5h2v2h-2z"],
  config: [
    "M12 12a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM12 10.5v1M12 15.5v1M9.5 13.5h1M13.5 13.5h1",
  ],
};

/** What sits inside a file of each kind. */
const FILE_MARKS: Record<string, string[]> = {
  file: [],
  markdown: ["M8 13h8M8 16.5h5"],
  readme: ["M12 12.5v.01M12 15v3"],
  changelog: ["M8 13h2M12 13h4M8 16.5h2M12 16.5h4"],
  spec: ["M12 11.5l3 3.5-3 3.5-3-3.5z"],
  agents: ["M12 12v6M9.4 13.5l5.2 3M9.4 16.5l5.2-3"],
  typescript: ["M8.5 12.5h5M11 12.5v5.5"],
  javascript: ["M13 12v4.5a1.5 1.5 0 0 1-3 0"],
  json: [
    "M10 12c-1 0-1.5.5-1.5 1.3v.7c0 .6-.4 1-1 1 .6 0 1 .4 1 1v.7c0 .8.5 1.3 1.5 1.3",
    "M14 12c1 0 1.5.5 1.5 1.3v.7c0 .6.4 1 1 1-.6 0-1 .4-1 1v.7c0 .8-.5 1.3-1.5 1.3",
  ],
  yaml: ["M8.5 12.5l2 2.5 2-2.5M10.5 15v3M14 13h2M14 16.5h2"],
  package: ["M12 11.5l3.5 1.8v3.9L12 19l-3.5-1.8v-3.9zM8.5 13.3l3.5 1.8 3.5-1.8M12 15.1V19"],
  lock: ["M9.5 15h5v3.5h-5zM10.5 15v-1.5a1.5 1.5 0 0 1 3 0V15"],
  eslint: ["M12 11.5l3 1.75v3.5L12 18.5l-3-1.75v-3.5z"],
  prettier: ["M8 12.5h3M8 15h6M8 17.5h4"],
  tsconfig: ["M12 13.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM12 11.5v1M12 17.5v1M9 15h1M14 15h1"],
  docker: ["M8 15h8l-.5 2a2 2 0 0 1-2 1.5h-3A2.5 2.5 0 0 1 8 16zM9 13h2v2H9zM11 13h2v2h-2z"],
  feature: ["M8.5 15l2.5 2.5 4.5-5"],
  java: ["M9 13h6v2.5a3 3 0 0 1-6 0zM15 13.5h.5a1.2 1.2 0 0 1 0 2.4H15"],
  python: ["M9.5 12.5h3.5a1.5 1.5 0 0 1 1.5 1.5v1.5H11a1.5 1.5 0 0 0-1.5 1.5v1"],
  css: ["M10 12l-1 6M14 12l-1 6M8.5 14h7M8 16h7"],
  html: ["M10 12.5 8 15l2 2.5M14 12.5l2 2.5-2 2.5"],
  image: ["M8 18l2.5-3 2 2 1.5-1.5L16 18M14.5 12.5h.01"],
  gitignore: ["M9.5 15a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0M10.2 16.8l3.6-3.6"],
  license: ["M12 12v6M9 13.5h6M8.5 13.5 8 16h2zM15.5 13.5l-.5 2.5h2zM10.5 18h3"],
};

/** Every kind's glyph, the folders closed: for the tests and the help. */
export const ICON_GLYPHS: Record<string, string[]> = {
  folder: [FOLDER],
  ...Object.fromEntries(
    Object.entries(FOLDER_MARKS).map(([k, m]) => [`folder-${k}`, [FOLDER, ...m]]),
  ),
  ...Object.fromEntries(Object.entries(FILE_MARKS).map(([k, m]) => [k, [FILE, FOLD, ...m]])),
};

/** Folder names → kind and token (A12, A31). */
const FOLDERS: Record<string, [string, string]> = {
  docs: ["docs", "--blue"],
  src: ["src", "--accent-soft"],
  test: ["test", "--ok"],
  tests: ["test", "--ok"],
  features: ["features", "--accent"],
  specs: ["specs", "--accent"],
  ".github": ["github", "--row-text"],
  node_modules: ["node_modules", "--muted"],
  scripts: ["scripts", "--row-text"],
  dist: ["dist", "--muted"],
  build: ["dist", "--muted"],
  out: ["dist", "--muted"],
  bin: ["bin", "--muted"],
  ".claude": ["claude", "--muted"],
  ".idea": ["idea", "--muted"],
  ".vscode": ["vscode", "--muted"],
  public: ["public", "--row-text"],
  assets: ["assets", "--row-text"],
  components: ["components", "--accent-soft"],
  lib: ["lib", "--accent-soft"],
  packages: ["packages", "--accent-soft"],
  apps: ["apps", "--accent-soft"],
  config: ["config", "--amber"],
};

/** Whole file names → kind (without case). */
const NAMES: Record<string, string> = {
  ".gitignore": "gitignore",
  license: "license",
  "license.md": "license",
  "license.txt": "license",
  "package.json": "package",
  "package-lock.json": "lock",
  "changelog.md": "changelog",
  "readme.md": "readme",
  "agents.md": "agents",
  "claude.md": "agents",
  "spec.md": "spec",
  dockerfile: "docker",
};

/** Extensions → kind. */
const EXTENSIONS: Record<string, string> = {
  md: "markdown",
  markdown: "markdown",
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  feature: "feature",
  java: "java",
  py: "python",
  css: "css",
  scss: "css",
  html: "html",
  htm: "html",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  svg: "image",
  webp: "image",
  ico: "image",
};

/** Each file kind's token (A31). */
const FILE_TOKENS: Record<string, string> = {
  spec: "--accent",
  agents: "--accent",
  feature: "--accent",
  markdown: "--blue",
  readme: "--blue",
  changelog: "--blue",
  json: "--amber",
  yaml: "--amber",
  package: "--amber",
  lock: "--amber",
  tsconfig: "--amber",
  eslint: "--amber",
  prettier: "--amber",
  typescript: "--accent-soft",
  javascript: "--accent-soft",
  java: "--accent-soft",
  python: "--accent-soft",
  css: "--accent-soft",
  html: "--accent-soft",
  gitignore: "--row-text",
  license: "--row-text",
  docker: "--row-text",
  image: "--row-text",
  file: "--muted",
};

function fileKind(name: string): string {
  const n = name.toLowerCase();
  if (NAMES[n]) return NAMES[n]!;
  if (/^tsconfig(\..+)?\.json$/.test(n)) return "tsconfig";
  if (/^eslint\.config\.|^\.eslintrc/.test(n)) return "eslint";
  if (/^prettier\.config\.|^\.prettierrc/.test(n)) return "prettier";
  if (/^dockerfile\./.test(n)) return "docker";
  const ext = n.includes(".") ? n.slice(n.lastIndexOf(".") + 1) : "";
  return EXTENSIONS[ext] ?? "file";
}

/** A folder's or file's icon: its kind, its colour's token and its paths (REQ-187). */
export function iconOf(name: string, dir: boolean, open = false): FileIcon {
  if (dir) {
    const known = FOLDERS[name.toLowerCase()];
    const kind = known ? `folder-${known[0]}` : "folder";
    const token = known ? known[1] : "--muted";
    // Opened, the folder shows its open shape; its colour keeps its kind.
    return { kind, token, paths: open ? FOLDER_OPEN : ICON_GLYPHS[kind]! };
  }
  const kind = fileKind(name);
  return { kind, token: FILE_TOKENS[kind]!, paths: ICON_GLYPHS[kind]! };
}
