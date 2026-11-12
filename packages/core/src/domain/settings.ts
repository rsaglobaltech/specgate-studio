import type { Lang } from "./help.js";

/**
 * The settings editor (draft-settings REQ-141 … REQ-143): every setting under
 * one of two scopes and one of nine sections. A project setting is
 * specgate's: its key, file, values and current value come from `specgate
 * config keys --json` and `config list --json` (A6, specgate 0.34), and it is
 * saved only by `specgate config set` (REQ-142). A user setting is the
 * studio's, kept in the Developer's own settings file (A2). Names and
 * descriptions in English and Spanish: the search reads the studio's
 * language (A4). Pure.
 */

export type SettingScope = "project" | "user";
export const SCOPES: readonly SettingScope[] = ["project", "user"];

/** The nine sections, in the order Settings shows them (REQ-143). */
export const SETTING_SECTIONS = [
  "agents",
  "preferences",
  "guards",
  "quality",
  "alm",
  "editor",
  "terminal",
  "shortcuts",
  "appearance",
] as const;
export type SettingSection = (typeof SETTING_SECTIONS)[number];

export const SECTION_NAMES: Record<SettingSection, Record<Lang, string>> = {
  agents: { en: "Agents and profiles", es: "Agentes y perfiles" },
  preferences: { en: "Preferences", es: "Preferencias del proyecto" },
  guards: { en: "Agent guards", es: "Protecciones del agente" },
  quality: { en: "Quality", es: "Calidad" },
  alm: { en: "ALM", es: "ALM" },
  editor: { en: "Editor", es: "Editor" },
  terminal: { en: "Terminal", es: "Terminal" },
  shortcuts: { en: "Shortcuts", es: "Atajos de teclado" },
  appearance: { en: "Appearance", es: "Apariencia" },
};

/** The scope each section's settings are in (A3). */
export const SECTION_SCOPE: Record<SettingSection, SettingScope> = {
  agents: "project",
  preferences: "project",
  guards: "project",
  quality: "project",
  alm: "project",
  editor: "user",
  terminal: "user",
  shortcuts: "user",
  appearance: "user",
};

/** One setting as the editor shows it. */
export interface Setting {
  /** specgate's config key for a project setting (`test_cmd`, `profiles.claude-opus.agent`); the studio's own for a user one. */
  key: string;
  scope: SettingScope;
  section: SettingSection;
  name: Record<Lang, string>;
  description: Record<Lang, string>;
  /** Its value now; null when none is set. */
  value: string | null;
  /** What applies when none is set; null when nothing does. */
  default: string | null;
  /** The values it takes, when it takes a few. */
  options?: readonly string[];
  /** The file it is kept in, relative to the project: specgate's answer (REQ-142). Null for a user setting. */
  file: string | null;
  /** A profile's or a check's name, for `profiles.<name>.*` and `checks.<name>.*`. */
  group?: string;
  /** For a key that names an environment variable: whether the host's environment sets it — never its value (A8). */
  env?: { name: string; set: boolean };
  /** Shown, not changed here (the shortcuts: A10). */
  readOnly?: boolean;
}

/** The field a new profile or check is created by: `profiles.<name>.agent`, `checks.<name>.run`. */
export interface NewGroup {
  prefix: "profiles" | "checks";
  field: string;
  /** specgate's file for it. */
  file: string;
}

/** What the editor shows: the settings a search keeps, and where the user's are kept. */
export interface SettingsView {
  /** The Developer's own settings file, or null when the host keeps none. */
  userFile: string | null;
  /** False when specgate could not list its keys: the project settings are not shown, never guessed. */
  catalog: boolean;
  settings: Setting[];
  /** Adding a profile or a check: the field it is created by. */
  adds: NewGroup[];
}

/** One key of `specgate config keys --json`. */
export interface CatalogKey {
  key: string;
  description: string;
  values: string[] | null;
  pattern: string | null;
  default: unknown;
  current: unknown;
  file: string;
}

interface Words {
  name: Record<Lang, string>;
  description: Record<Lang, string>;
}
const w = (en: string, es: string, den: string, des: string): Words => ({
  name: { en, es },
  description: { en: den, es: des },
});

/**
 * The studio's words for specgate's keys. A key specgate adds later, absent
 * here, shows under its own name with specgate's description.
 */
const PROJECT_WORDS: Record<string, Words> = {
  agent: w(
    "Who builds by default",
    "Quién programa por defecto",
    "The agent the harness and the studio's Build hand each requirement to, with {prompt_file}.",
    "El agente al que el harness y Construir del studio dan cada requisito, con {prompt_file}.",
  ),
  agent_profile: w(
    "Default profile",
    "Perfil por defecto",
    "The profile of .harness/profiles.yaml whose agent the harness uses by default.",
    "El perfil de .harness/profiles.yaml cuyo agente usa el harness por defecto.",
  ),
  "profiles.*.agent": w(
    "Agent command",
    "Comando del agente",
    "The profile's agent command, with {prompt_file} where the prompt goes.",
    "El comando del agente del perfil, con {prompt_file} donde va el prompt.",
  ),
  "profiles.*.advisory": w(
    "Advisory only",
    "Solo consultivo",
    "true for a reviewer or adversary: its writes are discarded.",
    "true para un revisor o adversario: lo que escribe se descarta.",
  ),
  "profiles.*.cost_per_run_hint": w(
    "Estimated cost per run",
    "Coste estimado por ejecución",
    "What one run of the profile is estimated to cost; Report labels it estimated.",
    "Lo que se estima que cuesta una ejecución del perfil; el Informe lo marca como estimado.",
  ),
  "profiles.*.price_per_input_token": w(
    "Price per input token",
    "Precio por token de entrada",
    "With the output price, specgate measures the cost from the tokens.",
    "Con el precio de salida, specgate mide el coste a partir de los tokens.",
  ),
  "profiles.*.price_per_output_token": w(
    "Price per output token",
    "Precio por token de salida",
    "The price of one output token.",
    "El precio de un token de salida.",
  ),
  "profiles.*.price_per_cache_read_token": w(
    "Price per cache-read token",
    "Precio por token leído de caché",
    "The input price when not set.",
    "El precio de entrada si no se fija.",
  ),
  "profiles.*.price_per_cache_write_token": w(
    "Price per cache-write token",
    "Precio por token escrito en caché",
    "The input price when not set.",
    "El precio de entrada si no se fija.",
  ),
  test_cmd: w(
    "Test command",
    "Las pruebas que corre el gate",
    "The command the gate runs as the project's tests, in every Check and Build.",
    "El comando que el gate corre como pruebas del proyecto, en cada Comprobar y Construir.",
  ),
  arch_cmd: w(
    "Architecture check",
    "Comprobación de arquitectura",
    "Your architecture check (ArchUnit, dependency-cruiser…), run by the gate before the tests.",
    "Tu comprobación de arquitectura (ArchUnit, dependency-cruiser…), que el gate corre antes de las pruebas.",
  ),
  language: w(
    "Specification language",
    "Idioma de la spec",
    "The language specgate writes generated prose in; technical terms stay in English.",
    "El idioma en que specgate escribe la prosa que genera; los términos técnicos siguen en inglés.",
  ),
  profile: w(
    "Commands help lists",
    "Comandos que lista la ayuda",
    "Which commands `specgate --help` lists by default.",
    "Qué comandos lista `specgate --help` por defecto.",
  ),
  pet: w(
    "Gato in status",
    "Gato en status",
    "Whether Gato, the cat that keeps the gate, shows up at the end of `status`.",
    "Si Gato, el gato que guarda el gate, aparece al final de `status`.",
  ),
  test_cmd_affected: w(
    "Affected tests command",
    "Comando de las pruebas afectadas",
    "What `check --affected` and `apply` run instead of the whole suite, with {files}.",
    "Lo que `check --affected` y `apply` corren en lugar de toda la suite, con {files}.",
  ),
  full_on: w(
    "Files that run the whole suite",
    "Archivos que corren toda la suite",
    "Globs whose change makes `check --affected` run every test, comma-separated.",
    "Patrones cuyo cambio hace que `check --affected` corra todas las pruebas, separados por comas.",
  ),
  gate_parallel: w(
    "Architecture and tests side by side",
    "Arquitectura y pruebas a la vez",
    "Whether the gate runs the architecture check and the tests at the same time.",
    "Si el gate corre la comprobación de arquitectura y las pruebas al mismo tiempo.",
  ),
  agent_guard: w(
    "Agent guards",
    "Protecciones del agente",
    "Whether the agent plugins refuse an edit to source code until a test names the requirement.",
    "Si los plugins del agente rechazan editar código hasta que una prueba nombre el requisito.",
  ),
  quality: w(
    "Quality level",
    "Nivel de calidad",
    "basic and strict set the coverage and mutation thresholds; custom leaves them to you.",
    "basic y strict fijan los umbrales de cobertura y mutación; custom te los deja a ti.",
  ),
  diff_coverage: w(
    "Diff coverage threshold",
    "Umbral de cobertura del diff",
    "The % of the changed executable lines a test must run.",
    "El % de las líneas ejecutables cambiadas que una prueba debe recorrer.",
  ),
  mutation_score: w(
    "Mutation score threshold",
    "Umbral de mutación",
    "The % of the mutants on changed lines a test must kill.",
    "El % de los mutantes en líneas cambiadas que una prueba debe matar.",
  ),
  "checks.*.run": w(
    "Command",
    "Comando",
    "The check's command, or a built-in such as builtin:commits.",
    "El comando del chequeo, o uno integrado como builtin:commits.",
  ),
  "checks.*.when": w("Stage", "Etapa", "The stage it runs in.", "La etapa en que corre."),
  "checks.*.gate": w(
    "Fails the gate",
    "Falla el gate",
    "Whether a failure fails the gate; false only reports it.",
    "Si un fallo hace fallar el gate; false solo lo informa.",
  ),
  "checks.*.runner": w("Runner", "Cómo corre", "How it runs.", "Cómo se ejecuta."),
  "checks.*.image": w(
    "Image",
    "Imagen",
    "The image a docker runner uses.",
    "La imagen que usa el runner docker.",
  ),
  "checks.*.timeout": w(
    "Time limit",
    "Límite de tiempo",
    "Its time limit, in whole seconds.",
    "Su límite de tiempo, en segundos.",
  ),
  "checks.*.sarif": w(
    "SARIF report",
    "Informe SARIF",
    "The SARIF report it writes, inside the project.",
    "El informe SARIF que escribe, dentro del proyecto.",
  ),
  "checks.*.report": w(
    "Coverage or mutation report",
    "Informe de cobertura o mutación",
    "A coverage or mutation report specgate measures, format:path.",
    "Un informe de cobertura o mutación que specgate mide, formato:ruta.",
  ),
  "checks.*.scope": w(
    "Findings that count",
    "Hallazgos que cuentan",
    "Those in the changed files, or every new one.",
    "Los de los archivos cambiados, o todos los nuevos.",
  ),
  "checks.*.env": w(
    "Variables it gets",
    "Variables que recibe",
    "The environment variable names it gets, comma-separated; values come from the environment.",
    "Los nombres de las variables de entorno que recibe, separados por comas; los valores vienen del entorno.",
  ),
  "checks.*.profile": w(
    "Profile",
    "Perfil",
    "For builtin:review and builtin:adversary: the profile whose agent runs it.",
    "Para builtin:review y builtin:adversary: el perfil cuyo agente lo corre.",
  ),
  "checks.*.needs": w(
    "Needs",
    "Necesita",
    "An earlier check whose output this one reads.",
    "Un chequeo anterior cuya salida lee este.",
  ),
  "checks.*.network": w(
    "Network",
    "Red",
    "false runs a docker check with no network.",
    "false corre un chequeo docker sin red.",
  ),
  "checks.*.shell": w(
    "Through a shell",
    "Con una shell",
    "false passes the command as the image's arguments instead of sh -c.",
    "false pasa el comando como argumentos de la imagen en lugar de sh -c.",
  ),
  "checks.*.docker": w(
    "Host's Docker",
    "Docker del host",
    "true gives the container the host's Docker, for tests that start containers.",
    "true da al contenedor el Docker del host, para pruebas que arrancan contenedores.",
  ),
  "alm.provider": w(
    "Provider",
    "Proveedor",
    "The ALM: jira, azure, github, or npm:<package> for a community provider.",
    "El ALM: jira, azure, github, o npm:<paquete> para un proveedor de la comunidad.",
  ),
  "alm.base_url": w(
    "Site",
    "Sitio",
    "The site (Jira), the organisation (Azure), or GitHub Enterprise Server's API URL.",
    "El sitio (Jira), la organización (Azure) o la URL de la API de GitHub Enterprise Server.",
  ),
  "alm.project_key": w(
    "Project key",
    "Clave del proyecto",
    "The project key (Jira) or name (Azure).",
    "La clave (Jira) o el nombre (Azure) del proyecto.",
  ),
  "alm.cloud_id": w(
    "Cloud id",
    "Cloud id",
    "Jira: auto, or the site id, to go through Atlassian's gateway.",
    "Jira: auto, o el id del sitio, para pasar por la pasarela de Atlassian.",
  ),
  "alm.issue_type": w(
    "Issue type",
    "Tipo de incidencia",
    "The type `alm sync` creates (default Task).",
    "El tipo que crea `alm sync` (por defecto Task).",
  ),
  "alm.done_state": w(
    "Done state",
    "Estado de cierre",
    "Azure: the state `alm sync` closes to (default Done).",
    "Azure: el estado al que cierra `alm sync` (por defecto Done).",
  ),
  "alm.acceptance_field": w(
    "Acceptance criteria field",
    "Campo de criterios de aceptación",
    "Jira: the field that holds acceptance criteria, e.g. customfield_10050.",
    "Jira: el campo que guarda los criterios de aceptación, p. ej. customfield_10050.",
  ),
  "alm.repo": w("Repository", "Repositorio", "GitHub: owner/name.", "GitHub: dueño/nombre."),
  "alm.token_env": w(
    "Token from the variable",
    "Token desde la variable",
    "The name of the environment variable that holds the API token — never the token.",
    "El nombre de la variable de entorno que guarda el token de la API — nunca el token.",
  ),
  "alm.user_env": w(
    "Account from the variable",
    "Cuenta desde la variable",
    "Jira: the name of the variable that holds the account's email.",
    "Jira: el nombre de la variable que guarda el email de la cuenta.",
  ),
  "alm.pr.repo": w(
    "Pull requests: repository",
    "Pull requests: repositorio",
    "`specgate alm pr`: the repository, owner/name.",
    "`specgate alm pr`: el repositorio, dueño/nombre.",
  ),
  "alm.pr.base": w(
    "Pull requests: base branch",
    "Pull requests: rama base",
    "`specgate alm pr`: the branch pull requests target.",
    "`specgate alm pr`: la rama a la que van los pull requests.",
  ),
  "alm.pr.token_env": w(
    "Pull requests: token from the variable",
    "Pull requests: token desde la variable",
    "`specgate alm pr`: the name of the variable that holds the GitHub token.",
    "`specgate alm pr`: el nombre de la variable que guarda el token de GitHub.",
  ),
  "alm.pr.base_url": w(
    "Pull requests: API URL",
    "Pull requests: URL de la API",
    "`specgate alm pr`: the API URL; only for GitHub Enterprise Server.",
    "`specgate alm pr`: la URL de la API; solo para GitHub Enterprise Server.",
  ),
};

/** The section a specgate key belongs to (A3); a key the studio does not know goes to Preferences. */
export function sectionOfKey(key: string): SettingSection {
  if (key === "agent" || key === "agent_profile" || key.startsWith("profiles.")) return "agents";
  if (key === "agent_guard") return "guards";
  if (
    key === "quality" ||
    key === "diff_coverage" ||
    key === "mutation_score" ||
    key.startsWith("checks.")
  )
    return "quality";
  if (key.startsWith("alm.")) return "alm";
  return "preferences";
}

/** `profiles.claude-opus.agent` → its template `profiles.*.agent` and group `claude-opus`. */
function templateOf(key: string): { template: string; group?: string } {
  const m = /^(profiles|checks)\.([^.]+)\.(.+)$/.exec(key);
  if (!m) return { template: key };
  return { template: `${m[1]}.*.${m[3]}`, group: m[2]! };
}

const text = (v: unknown): string | null => {
  if (typeof v === "string") return v.trim() ? v : null;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
};

/** The fields of a check shown even when not set: its command, when it runs, whether it fails the gate, its report. */
const CHECK_FIELDS = new Set(["run", "when", "gate", "report"]);

/** A key whose value is an environment variable's name (A8): `alm.token_env`, `alm.pr.token_env`. */
const isEnvKey = (key: string) => /_env$/.test(key);

/**
 * The project's settings from specgate's catalog (`config keys --json`) and
 * the values set (`config list --json` with its `files`): each key once, the
 * templated ones (`profiles.<name>.*`, `checks.<name>.*`) once per profile or
 * check the project has (REQ-143). `env` says whether the variable a key names
 * is set, never its value (A8).
 */
export function projectSettings(
  catalog: readonly CatalogKey[],
  values: Record<string, unknown>,
  files: Record<string, string>,
  envSet: (name: string) => boolean,
): { settings: Setting[]; adds: NewGroup[] } {
  const groups = { profiles: new Set<string>(), checks: new Set<string>() };
  for (const k of Object.keys(values)) {
    const t = templateOf(k);
    if (t.group) groups[k.startsWith("profiles.") ? "profiles" : "checks"].add(t.group);
  }
  const out: Setting[] = [];
  const adds: NewGroup[] = [];
  const make = (c: CatalogKey, key: string, group?: string): Setting => {
    const words = PROJECT_WORDS[templateOf(key).template];
    const value = key in values ? text(values[key]) : group ? null : text(c.current);
    const s: Setting = {
      key,
      scope: "project",
      section: sectionOfKey(key),
      name: words?.name ?? { en: key, es: key },
      description: words?.description ?? { en: c.description, es: c.description },
      value,
      default: text(c.default),
      ...(c.values?.length ? { options: [...c.values] } : {}),
      file: files[key] ?? c.file,
      ...(group ? { group } : {}),
    };
    if (isEnvKey(key)) {
      const name = value ?? s.default;
      if (name) s.env = { name, set: envSet(name) };
    }
    return s;
  };
  const templated = (c: CatalogKey) => /^(profiles|checks)\.<name>\.(.+)$/.exec(c.key);
  const done = new Set<string>();
  for (const c of catalog) {
    const m = templated(c);
    if (!m) {
      out.push(make(c, c.key));
      continue;
    }
    const prefix = m[1] as "profiles" | "checks";
    if (done.has(prefix)) continue;
    done.add(prefix);
    // Each profile's or check's fields together, in specgate's order (REQ-143).
    const fields = catalog
      .map((k) => [k, templated(k)] as const)
      .filter(([, t]) => t?.[1] === prefix)
      .map(([k, t]) => [k, t![2]!] as const);
    for (const [k, field] of fields)
      if ((prefix === "profiles" && field === "agent") || (prefix === "checks" && field === "run"))
        adds.push({ prefix, field, file: k.file });
    for (const g of groups[prefix])
      for (const [k, field] of fields) {
        const key = `${prefix}.${g}.${field}`;
        if (prefix === "checks" && !CHECK_FIELDS.has(field) && !(key in values)) continue;
        out.push(make(k, key, g));
      }
  }
  // The section order, each keeping specgate's order within it.
  const order = (s: Setting) => SETTING_SECTIONS.indexOf(s.section);
  return { settings: out.sort((a, b) => order(a) - order(b)), adds };
}

/** The workbench's shortcuts (draft-workbench REQ-032): shown in Settings; `Mod` is ⌘ on macOS, Ctrl elsewhere. */
export const SHORTCUTS: ReadonlyArray<{ id: string; keys: string; name: Record<Lang, string> }> = [
  { id: "palette", keys: "Mod+Shift+P", name: { en: "Command palette", es: "Paleta de comandos" } },
  { id: "openFile", keys: "Mod+P", name: { en: "Open a file", es: "Abrir un archivo" } },
  { id: "save", keys: "Mod+S", name: { en: "Save", es: "Guardar" } },
  { id: "closeTab", keys: "Mod+W", name: { en: "Close the tab", es: "Cerrar la pestaña" } },
  { id: "toggleSidebar", keys: "Mod+B", name: { en: "Side bar", es: "Barra lateral" } },
  { id: "togglePanel", keys: "Mod+J", name: { en: "Bottom panel", es: "Panel inferior" } },
  { id: "toggleAgent", keys: "Mod+Alt+B", name: { en: "Agent panel", es: "Panel del agente" } },
  { id: "terminal", keys: "Ctrl+`", name: { en: "Terminal", es: "Terminal" } },
  { id: "explorer", keys: "Mod+Shift+E", name: { en: "Explorer", es: "Explorador" } },
  { id: "find", keys: "Mod+F", name: { en: "Find in the file", es: "Buscar en el archivo" } },
  {
    id: "search",
    keys: "Mod+Shift+F",
    name: { en: "Search the project", es: "Buscar en el proyecto" },
  },
  { id: "splitRight", keys: "Mod+\\", name: { en: "Split the editor", es: "Dividir el editor" } },
  { id: "settings", keys: "Mod+,", name: { en: "Settings", es: "Ajustes" } },
];

type UserDef = Omit<Setting, "value" | "scope" | "file" | "options"> & {
  options: readonly string[];
};

/**
 * The studio's own settings, in the user's file (A2, A3, A10): appearance —
 * the studio's language and theme (draft-workbench REQ-034) — the editor and
 * the terminal. The shortcuts are shown apart: `shortcutSettings()`.
 */
export const USER_SETTINGS: readonly UserDef[] = [
  {
    key: "editor.fontSize",
    section: "editor",
    name: { en: "Font size", es: "Tamaño de letra" },
    description: {
      en: "The editor's font size, in pixels.",
      es: "El tamaño de letra del editor, en píxeles.",
    },
    default: "13",
    options: ["11", "12", "13", "14", "15", "16", "18"],
  },
  {
    key: "editor.tabSize",
    section: "editor",
    name: { en: "Tab size", es: "Tamaño del tabulador" },
    description: {
      en: "The spaces a tab takes in the editor.",
      es: "Los espacios que ocupa un tabulador en el editor.",
    },
    default: "4",
    options: ["2", "4", "8"],
  },
  {
    key: "editor.wordWrap",
    section: "editor",
    name: { en: "Word wrap", es: "Ajuste de línea" },
    description: {
      en: "Whether a long line wraps in the editor.",
      es: "Si una línea larga se parte en el editor.",
    },
    default: "on",
    options: ["on", "off"],
  },
  {
    key: "terminal.fontSize",
    section: "terminal",
    name: { en: "Font size", es: "Tamaño de letra" },
    description: {
      en: "The terminal's font size, in pixels.",
      es: "El tamaño de letra de la terminal, en píxeles.",
    },
    default: "12",
    options: ["11", "12", "13", "14", "16"],
  },
  {
    key: "terminal.scrollback",
    section: "terminal",
    name: { en: "Scrollback", es: "Historial" },
    description: {
      en: "The lines a terminal keeps above what it shows.",
      es: "Las líneas que una terminal guarda por encima de lo que muestra.",
    },
    default: "10000",
    options: ["1000", "5000", "10000", "50000"],
  },
  {
    key: "lang",
    section: "appearance",
    name: { en: "Language", es: "Idioma" },
    description: {
      en: "The language of the studio's labels, menus and notices.",
      es: "El idioma de las etiquetas, los menús y los avisos del studio.",
    },
    default: null,
    options: ["en", "es"],
  },
  {
    key: "theme",
    section: "appearance",
    name: { en: "Theme", es: "Tema" },
    description: {
      en: "The studio's colours: dark or light.",
      es: "Los colores del studio: oscuro o claro.",
    },
    default: "dark",
    options: ["dark", "light"],
  },
];

/** The shortcuts as settings of the user scope, shown and not changed here (A10). */
export function shortcutSettings(): Setting[] {
  return SHORTCUTS.map((s) => ({
    key: `shortcut.${s.id}`,
    scope: "user" as const,
    section: "shortcuts" as const,
    name: s.name,
    description: { en: "", es: "" },
    value: s.keys,
    default: s.keys,
    file: null,
    readOnly: true,
  }));
}

/** Lower case, without accents: «configuración» is found as «configuracion». */
function fold(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * The settings whose name, description or specgate key holds the query, in
 * the studio's language (A4); each keeps its scope and section. An empty
 * query keeps them all.
 */
export function searchSettings<S extends Pick<Setting, "key" | "name" | "description">>(
  settings: readonly S[],
  query: string,
  lang: Lang,
): S[] {
  const q = fold(query.trim());
  if (!q) return [...settings];
  return settings.filter((s) =>
    [s.name[lang], s.description[lang], s.key].some((t) => fold(t).includes(q)),
  );
}

/** A user setting's definition, when `value` is one it takes; null otherwise. */
export function userSetting(key: unknown, value: unknown): UserDef | null {
  const def = USER_SETTINGS.find((s) => s.key === key);
  return def && typeof value === "string" && def.options.includes(value) ? def : null;
}

/** A value as the editor shows it: text, or null when none is set. */
export function settingValue(value: unknown): string | null {
  return text(value);
}

/**
 * `specgate config set <key> <value>` as the Developer would type it: a value
 * with a space or a quote in double quotes, read as one argument by every
 * platform's shell (REQ-142). Shown only: it runs with an argument array.
 */
export function configSetLine(key: string, value: string): string {
  return `specgate config set ${key} ${configValue(value)}`;
}

/** A value as one argument a shell reads whole: in double quotes when it holds a space or a quote. */
export function configValue(value: string): string {
  return /^[\w./:=@%+,{}-]+$/.test(value) ? value : `"${value.replace(/(["\\$`])/g, "\\$1")}"`;
}

/** The catalog's keys from `config keys --json`, each well formed; null when it is no catalog. */
export function catalogOf(data: unknown): CatalogKey[] | null {
  const keys = (data as { keys?: unknown } | null)?.keys;
  if (!Array.isArray(keys)) return null;
  return keys
    .filter(
      (k): k is Record<string, unknown> =>
        !!k && typeof k === "object" && typeof (k as { key?: unknown }).key === "string",
    )
    .map((k) => ({
      key: k.key as string,
      description: typeof k.description === "string" ? k.description : "",
      values: Array.isArray(k.values) ? k.values.map(String) : null,
      pattern: typeof k.pattern === "string" ? k.pattern : null,
      default: k.default,
      current: k.current,
      file: typeof k.file === "string" ? k.file : "",
    }));
}
