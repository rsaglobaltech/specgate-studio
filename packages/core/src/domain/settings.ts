import type { Lang } from "./help.js";

/**
 * The settings editor (draft-settings REQ-141): every setting under one of
 * two scopes. A project setting is specgate's, kept in the project's files and
 * shared through git (A2); a user setting is the studio's, kept in the
 * Developer's own settings file and applying to every project. Names and
 * descriptions in English and Spanish: the search reads the studio's language.
 */

export type SettingScope = "project" | "user";
export const SCOPES: readonly SettingScope[] = ["project", "user"];

export interface SettingDef {
  /** specgate's config key for a project setting; the studio's own for a user one. */
  key: string;
  scope: SettingScope;
  name: Record<Lang, string>;
  description: Record<Lang, string>;
  /** The values a user setting takes. */
  options?: readonly string[];
}

/** A setting with its value now: null when none is set. */
export interface Setting extends SettingDef {
  value: string | null;
}

/** What the editor shows: the settings kept by a search, and the user's file. */
export interface SettingsView {
  /** The Developer's own settings file, or null when the host keeps none. */
  userFile: string | null;
  settings: Setting[];
}

/**
 * The settings, project first. The project's are the keys `specgate config
 * set` saves today (A7); the user's are the studio's language and theme
 * (draft-workbench REQ-034, A3).
 */
export const SETTINGS: readonly SettingDef[] = [
  {
    key: "test_cmd",
    scope: "project",
    name: { en: "Test command", es: "Comando de tests" },
    description: {
      en: "The command the gate runs for the project's tests.",
      es: "El comando con el que el gate ejecuta los tests del proyecto.",
    },
  },
  {
    key: "arch_cmd",
    scope: "project",
    name: { en: "Architecture command", es: "Comando de arquitectura" },
    description: {
      en: "The command that checks the architecture rules, run by the gate.",
      es: "El comando que comprueba las reglas de arquitectura, en el gate.",
    },
  },
  {
    key: "agent",
    scope: "project",
    name: { en: "Agent", es: "Agente" },
    description: {
      en: "The command the harness runs to build a requirement; it reads the prompt from {prompt_file}.",
      es: "El comando que el harness ejecuta para construir un requisito; lee el prompt de {prompt_file}.",
    },
  },
  {
    key: "language",
    scope: "project",
    name: { en: "Specification language", es: "Idioma de la especificación" },
    description: {
      en: "The language specgate writes the specification's prose in.",
      es: "El idioma en que specgate escribe la prosa de la especificación.",
    },
  },
  {
    key: "agent_guard",
    scope: "project",
    name: { en: "Agent guards", es: "Guardas del agente" },
    description: {
      en: "Whether specgate refuses an agent's writes outside the requirement it builds.",
      es: "Si specgate rechaza lo que un agente escribe fuera del requisito que construye.",
    },
  },
  {
    key: "lang",
    scope: "user",
    name: { en: "Language", es: "Idioma" },
    description: {
      en: "The language of the studio's labels, menus and notices.",
      es: "El idioma de las etiquetas, los menús y los avisos del studio.",
    },
    options: ["en", "es"],
  },
  {
    key: "theme",
    scope: "user",
    name: { en: "Theme", es: "Tema" },
    description: {
      en: "The studio's colours: dark or light.",
      es: "Los colores del studio: oscuro o claro.",
    },
    options: ["dark", "light"],
  },
];

/** Lower case, without accents: «configuración» is found as «configuracion». */
function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * The settings whose name, description or key holds the query, in the
 * studio's language (A4); each keeps its scope. An empty query keeps them all.
 */
export function searchSettings<S extends SettingDef>(
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
export function userSetting(key: unknown, value: unknown): SettingDef | null {
  const def = SETTINGS.find((s) => s.scope === "user" && s.key === key);
  return def && typeof value === "string" && (def.options ?? []).includes(value) ? def : null;
}

/** A value as the editor shows it: text, or null when none is set. */
export function settingValue(value: unknown): string | null {
  if (typeof value === "string") return value.trim() ? value : null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}
