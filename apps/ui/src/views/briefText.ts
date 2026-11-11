import type { Lang } from "../i18n.js";

/**
 * The Brief view's and Problems' labels in English and Spanish (draft-brief,
 * REQ-034). Spanish is typed against English: a label missing in one does
 * not compile.
 */
const en = {
  "problems.none": "No problem: the brief's last check found nothing.",
  "problems.fix": "Fix",
  "problems.feature": "The brief's checks",
  "problems.help": "What the brief's checks do",
  "brief.intro":
    "docs/brief.md, the brief the modules are drafted from. Edit it as markdown in the editor: its checks run on every save and show in Problems.",
  "brief.open": "Open docs/brief.md",
  "brief.modules": "Modules",
  "brief.none": "The brief lists no module yet.",
  "brief.unreadable": "specgate could not read the brief's modules.",
  "brief.drafted": "drafted",
  "brief.toDraft": "to draft",
  "brief.agent": "Agent: {agent}",
  "brief.noAgent": "No agent set: `specgate agents init --tool claude` sets one.",
  "brief.draft": "Draft the modules",
  "brief.draftHelp": 'What "Draft the modules" does',
};

const es: Record<keyof typeof en, string> = {
  "problems.none": "Ningún problema: la última comprobación del brief no encontró nada.",
  "problems.fix": "Arreglo",
  "problems.feature": "Las comprobaciones del brief",
  "problems.help": "Qué hacen las comprobaciones del brief",
  "brief.intro":
    "docs/brief.md, el brief del que se redactan los módulos. Edítalo como markdown en el editor: sus comprobaciones se ejecutan cada vez que guardas y aparecen en Problemas.",
  "brief.open": "Abrir docs/brief.md",
  "brief.modules": "Módulos",
  "brief.none": "El brief no lista ningún módulo todavía.",
  "brief.unreadable": "specgate no pudo leer los módulos del brief.",
  "brief.drafted": "redactado",
  "brief.toDraft": "por redactar",
  "brief.agent": "Agente: {agent}",
  "brief.noAgent": "Sin agente: `specgate agents init --tool claude` configura uno.",
  "brief.draft": "Redactar los módulos",
  "brief.draftHelp": 'Qué hace "Redactar los módulos"',
};

export type BriefKey = keyof typeof en;

export function bt(lang: Lang, key: BriefKey, vars?: Record<string, string | number>): string {
  const text = (lang === "es" ? es : en)[key];
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars?.[k] ?? `{${k}}`));
}
